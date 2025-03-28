// Firebase Admin Initialization for n8n
// IMPORTANT: This code must return data in the correct n8n format

// For n8n Function nodes, we need to export a function
module.exports = function ($node) {
	// Import firebase-admin
	const admin = require('firebase-admin');
	const fs = require('fs');

	// Path to service account in Render
	const secretPath = '/etc/secrets/sophosic-5c871-firebase-adminsdk-fbsvc-cc05d1af17.json';

	try {
		// Check if firebase is already initialized
		if (admin.apps.length === 0) {
			console.log('Initializing Firebase Admin SDK...');

			// Read service account file
			if (fs.existsSync(secretPath)) {
				const serviceAccount = JSON.parse(fs.readFileSync(secretPath, 'utf8'));

				// Initialize the app
				admin.initializeApp({
					credential: admin.credential.cert(serviceAccount),
					databaseURL: 'https://sophosic-5c871-default-rtdb.firebaseio.com',
				});

				console.log('Firebase Admin SDK initialized successfully');
			} else {
				console.error(`Service account file not found at ${secretPath}`);
				// Return error in correct n8n format
				return [
					{
						json: {
							success: false,
							message: `Service account file not found at ${secretPath}`,
						},
					},
				];
			}
		} else {
			console.log('Firebase Admin SDK already initialized');
		}

		// IMPORTANT: Always return an array of objects with a json property
		// This is the correct format expected by n8n
		return [
			{
				json: {
					success: true,
					message: 'Firebase initialized successfully',
					initialized: true,
					firebaseApps: admin.apps.length,
					sdkVersion: admin.SDK_VERSION,
				},
			},
		];
	} catch (error) {
		console.error('Error initializing Firebase:', error);

		// Return error in correct n8n format
		return [
			{
				json: {
					success: false,
					message: 'Firebase initialization failed',
					error: error.message,
					stack: error.stack,
				},
			},
		];
	}
};
