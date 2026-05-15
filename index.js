const express = require('express');
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI

const port = process.env.PORT;
const app = express();
app.use(cors())
app.use(express.json())
const dns = require("node:dns");
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dns.setServers(["8.8.8.8", "8.8.4.4"])


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// verify JWT function
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)
const verifyToken = async(req, res, next)=>{
  const authHeaders = req?.headers.authorization;
  if(!authHeaders){
    return res.status(401).json({message: 'Unauthorized'})
  };

  const token = authHeaders.split(' ')[1];
  if(!token){
    return res.status(401).json({message: "Unauthorized"})
  }
 
  try{
    const {payload} = await jwtVerify(token, JWKS)
    next()
  }catch(error){
    return res.status(403).json({message: 'Forbidden'})
  }
  
}
// end verify token function

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    
    const myDB = client.db('WanderLust');
    const collection = myDB.collection('destination')
    const bookingCollection = myDB.collection('booking')

    app.post('/destination',verifyToken, async (req, res) => {
      const newDestination = req.body;
      const result = await collection.insertOne(newDestination)
      res.send(result)
    })
    //get data
    app.get('/destination', async (req, res) => {
      const data = await collection.find().toArray()
      res.json(data)
    })
    //get one data
    app.get('/destination/:id',verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await collection.findOne(
        { _id: new ObjectId(id) }
      )
      res.json(result)
    })
    // updat patch api 
    app.patch('/destination/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      )
      res.json(result)
    })
    // delete method 
    app.delete('/destination/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await collection.deleteOne({ _id: new ObjectId(id) })
      res.json(result)
    })
    
    
    // booking api post
    app.post('/booking',verifyToken, async (req, res) => {
      const newBooking = req.body;
      const query = {
        userId: newBooking.userId,
        destinationId: newBooking.destinationId
      }
      const alreadyExist = await bookingCollection.findOne(query)
      if (alreadyExist) {
        return res.status(409).send({
          acknowledged: false,
          message: 'You already booked this destination'
        })
      }
      
      const result = await bookingCollection.insertOne(newBooking)
      res.json(result)
    })
    // my booki by user id
    app.get('/booking/:userId',verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId }).toArray()
      res.json(result)
    })
    // booking delete by id 
    app.delete('/booking/:id',verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) })
      res.json(result)
    })
     
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send("Hello From Express Server")
})


app.listen(port, () => {
  console.log('Express Server Is Running.... port', port)
})