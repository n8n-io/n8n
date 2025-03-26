// Firebase Admin example for n8n Function node
// This code should be pasted into a Function node in n8n

// For n8n Function node, we need to export a function
module.exports = async function () {
	// Import required modules
	const admin = require('firebase-admin');
	const fs = require('fs');

	// Path to the service account file in Render
	// The file is accessible at runtime from /etc/secrets/filename
	const secretPath = '/etc/secrets/sophosic-5c871-firebase-adminsdk-fbsvc-cc05d1af17.json';

	// Read and parse the service account file
	try {
		// Check if file exists
		if (fs.existsSync(secretPath)) {
			// Read and parse the service account JSON file
			const serviceAccount = JSON.parse(fs.readFileSync(secretPath, 'utf8'));

			// Initialize Firebase Admin SDK if not already initialized
			if (!admin.apps.length) {
				admin.initializeApp({
					credential: admin.credential.cert(serviceAccount),
					databaseURL: 'https://sophosic-5c871-default-rtdb.firebaseio.com',
				});
			}

			// Example: Access Firestore
			const firestore = admin.firestore();

			// Return success response
			return [
				{
					json: {
						success: true,
						message: 'Firebase Admin SDK initialized successfully',
						projectId: serviceAccount.project_id,
						sdkVersion: admin.SDK_VERSION,
					},
				},
			];
		} else {
			// File doesn't exist
			return [
				{
					json: {
						success: false,
						error: 'Service account file not found at ' + secretPath,
						suggestion: 'Make sure the secret file is properly configured in Render',
					},
				},
			];
		}
	} catch (error) {
		// Handle any errors
		return [
			{
				json: {
					success: false,
					error: error.message,
					stack: error.stack,
				},
			},
		];
	}
};
