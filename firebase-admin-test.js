// This is a sample code for testing firebase-admin in n8n Function node
// Just copy this into a Function node to test if firebase-admin is accessible

// Import the firebase-admin module
const admin = require('firebase-admin');

// Sample code to initialize firebase-admin (you'll need to replace with your own config)
try {
  // Check if firebase-admin is already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      // This is just for testing - you'll replace with your actual config
      credential: admin.credential.cert({
        projectId: 'your-project-id',
        clientEmail: 'your-client-email',
        privateKey: 'your-private-key'
      })
    });
  }

  // Create a sample response to show it's working
  const items = [];
  items.push({
    json: {
      success: true,
      message: 'Firebase admin loaded successfully',
      firebaseVersion: admin.SDK_VERSION
    }
  });

  return items;
} catch (error) {
  // Return error details
  const items = [];
  items.push({
    json: {
      success: false,
      error: error.message,
      stack: error.stack
    }
  });

  return items;
}
