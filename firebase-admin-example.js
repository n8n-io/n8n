// Example of using firebase-admin in n8n Function node
// NOTE: In n8n Function nodes, this code works as-is without any wrapper function

// Import firebase-admin
const admin = require('firebase-admin');

// Initialize Firebase Admin with your project details
// Firebase Admin SDK requires a service account, not client-side config
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      // Replace these with your service account values (not client config)
      projectId: "sophosic-5c871",
      // You need to get these from a service account JSON file from Firebase console
      // Project settings > Service accounts > Generate new private key
      clientEmail: "YOUR_SERVICE_ACCOUNT_EMAIL",
      privateKey: "YOUR_PRIVATE_KEY"
    }),
    databaseURL: "https://sophosic-5c871-default-rtdb.firebaseio.com"
  });
}

// Example: Access Firestore database
const db = admin.firestore();

// Example: Read data from Firestore
try {
  // Define the collection and document to read
  const collectionName = 'users';
  const documentId = 'testUser';

  // Create a document reference
  const docRef = db.collection(collectionName).doc(documentId);

  // Get the document
  return docRef.get()
    .then(doc => {
      if (doc.exists) {
        // Return the document data
        return [{
          json: {
            success: true,
            data: doc.data(),
            id: doc.id
          }
        }];
      } else {
        // Document doesn't exist
        return [{
          json: {
            success: false,
            message: `Document ${documentId} does not exist in collection ${collectionName}`
          }
        }];
      }
    })
    .catch(error => {
      // Handle any errors
      return [{
        json: {
          success: false,
          error: error.message,
          stack: error.stack
        }
      }];
    });
} catch (error) {
  // Handle any errors in the try block
  return [{
    json: {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }];
}
