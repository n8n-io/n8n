// Firebase Admin Initialization for n8n Function Node
// Uses environment variables for credential management on Render

// Export a function that takes 'items' as parameter (required by n8n)
module.exports = function (items) {
	// Import required modules
	const admin = require('firebase-admin');

	try {
		// Check if Firebase is already initialized
		if (admin.apps.length === 0) {
			// Get Firebase credentials from environment variables
			const privateKey = process.env.FIREBASE_PRIVATE_KEY
				? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
				: undefined;

			const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
			const projectId = process.env.FIREBASE_PROJECT_ID;
			const databaseURL =
				process.env.FIREBASE_DATABASE_URL || 'https://sophosic-5c871-default-rtdb.firebaseio.com';

			// Check if required environment variables are set
			if (!privateKey || !clientEmail || !projectId) {
				console.error('Required Firebase environment variables are missing');

				return [
					{
						json: {
							success: false,
							message: 'Firebase credentials not found in environment variables',
							requiredEnvVars: [
								'FIREBASE_PRIVATE_KEY',
								'FIREBASE_CLIENT_EMAIL',
								'FIREBASE_PROJECT_ID',
							],
						},
					},
				];
			}

			// Initialize Firebase Admin SDK with environment variables
			admin.initializeApp({
				credential: admin.credential.cert({
					projectId,
					clientEmail,
					privateKey,
				}),
				databaseURL: databaseURL,
			});

			console.log('Firebase Admin SDK initialized successfully with environment variables');
		} else {
			console.log('Firebase Admin SDK already initialized');
		}

		// Access Firestore (example)
		const db = admin.firestore();

		// Return success in proper n8n format
		return [
			{
				json: {
					success: true,
					message: 'Firebase initialized successfully',
					initialized: admin.apps.length > 0,
					firebaseApps: admin.apps.length,
					sdkVersion: admin.SDK_VERSION,
				},
			},
		];
	} catch (error) {
		console.error('Firebase initialization error:', error);

		// Return error in proper n8n format
		return [
			{
				json: {
					success: false,
					message: 'Firebase initialization failed',
					error: error.message,
				},
			},
		];
	}
};
