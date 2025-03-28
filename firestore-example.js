// Firestore CRUD operations example for n8n
// IMPORTANT: Must return an array of objects with json property

// Export a function for n8n
module.exports = function ($node) {
	// Import required modules
	const admin = require('firebase-admin');
	const fs = require('fs');

	// Path to service account file in Render
	const secretPath = '/etc/secrets/sophosic-5c871-firebase-adminsdk-fbsvc-cc05d1af17.json';

	try {
		// Initialize Firebase if not already initialized
		if (admin.apps.length === 0) {
			console.log('Initializing Firebase Admin SDK...');

			// Check if file exists
			if (!fs.existsSync(secretPath)) {
				console.error(`Service account file not found at ${secretPath}`);
				return [
					{
						json: {
							success: false,
							error: `Service account file not found at ${secretPath}`,
						},
					},
				];
			}

			// Read and parse service account file
			const serviceAccount = JSON.parse(fs.readFileSync(secretPath, 'utf8'));

			// Initialize Firebase
			admin.initializeApp({
				credential: admin.credential.cert(serviceAccount),
				databaseURL: 'https://sophosic-5c871-default-rtdb.firebaseio.com',
			});

			console.log('Firebase Admin SDK initialized successfully');
		} else {
			console.log('Firebase Admin SDK already initialized');
		}

		// Get Firestore instance
		const db = admin.firestore();

		// Get operation from input (with fallback to 'read')
		const inputData = $node.json;
		const operation = inputData.operation || 'read';
		const collectionName = inputData.collection || 'users';
		const documentId = inputData.documentId || null;
		const data = inputData.data || {};

		console.log(`Performing ${operation} operation on collection ${collectionName}`);

		// Perform the requested operation
		switch (operation) {
			case 'create':
				// Create a document
				if (documentId) {
					// Create with specific ID
					return db
						.collection(collectionName)
						.doc(documentId)
						.set(data)
						.then(() => {
							return [
								{
									json: {
										success: true,
										operation: 'create',
										documentId: documentId,
										data: data,
									},
								},
							];
						});
				} else {
					// Create with auto-generated ID
					return db
						.collection(collectionName)
						.add(data)
						.then((docRef) => {
							return [
								{
									json: {
										success: true,
										operation: 'create',
										documentId: docRef.id,
										data: data,
									},
								},
							];
						});
				}

			case 'read':
				if (documentId) {
					// Read a specific document
					return db
						.collection(collectionName)
						.doc(documentId)
						.get()
						.then((doc) => {
							if (doc.exists) {
								return [
									{
										json: {
											success: true,
											operation: 'read',
											documentId: doc.id,
											exists: true,
											data: doc.data(),
										},
									},
								];
							} else {
								return [
									{
										json: {
											success: false,
											operation: 'read',
											documentId: documentId,
											exists: false,
											message: 'Document not found',
										},
									},
								];
							}
						});
				} else {
					// Read all documents in collection
					return db
						.collection(collectionName)
						.get()
						.then((snapshot) => {
							const documents = [];
							snapshot.forEach((doc) => {
								documents.push({
									id: doc.id,
									...doc.data(),
								});
							});

							return [
								{
									json: {
										success: true,
										operation: 'read',
										collection: collectionName,
										count: documents.length,
										documents: documents,
									},
								},
							];
						});
				}

			case 'update':
				if (!documentId) {
					return [
						{
							json: {
								success: false,
								operation: 'update',
								error: 'Document ID is required for update operation',
							},
						},
					];
				}

				return db
					.collection(collectionName)
					.doc(documentId)
					.update(data)
					.then(() => {
						return [
							{
								json: {
									success: true,
									operation: 'update',
									documentId: documentId,
									data: data,
								},
							},
						];
					});

			case 'delete':
				if (!documentId) {
					return [
						{
							json: {
								success: false,
								operation: 'delete',
								error: 'Document ID is required for delete operation',
							},
						},
					];
				}

				return db
					.collection(collectionName)
					.doc(documentId)
					.delete()
					.then(() => {
						return [
							{
								json: {
									success: true,
									operation: 'delete',
									documentId: documentId,
								},
							},
						];
					});

			default:
				return [
					{
						json: {
							success: false,
							error: `Unknown operation: ${operation}`,
							validOperations: ['create', 'read', 'update', 'delete'],
						},
					},
				];
		}
	} catch (error) {
		console.error('Error in Firestore operation:', error);

		// Return error in n8n format
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
