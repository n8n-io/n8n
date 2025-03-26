// Firestore CRUD Example for n8n Function Node
// This shows how to Create, Read, Update, and Delete data in Firestore

// For n8n Function node, we need to export a function
module.exports = async function () {
	// Import required modules
	const admin = require('firebase-admin');
	const fs = require('fs');

	// Path to the service account file in Render
	const secretPath = '/etc/secrets/sophosic-5c871-firebase-adminsdk-fbsvc-cc05d1af17.json';

	try {
		// Check if file exists
		if (!fs.existsSync(secretPath)) {
			return [
				{
					json: {
						success: false,
						error: 'Service account file not found at ' + secretPath,
					},
				},
			];
		}

		// Read and parse the service account JSON file
		const serviceAccount = JSON.parse(fs.readFileSync(secretPath, 'utf8'));

		// Initialize Firebase Admin SDK if not already initialized
		if (!admin.apps.length) {
			admin.initializeApp({
				credential: admin.credential.cert(serviceAccount),
				databaseURL: 'https://sophosic-5c871-default-rtdb.firebaseio.com',
			});
		}

		// Get Firestore instance
		const db = admin.firestore();

		// EXAMPLE: Get the operation from input parameters
		// This allows you to dynamically choose what operation to perform
		// In n8n, set a parameter named "operation" with values like "create", "read", "update", or "delete"
		const operation = $input.item.json.operation || 'read';

		// Collection to work with
		const collectionName = $input.item.json.collection || 'users';

		// Document ID (for read, update, delete operations)
		const documentId = $input.item.json.documentId;

		// Data to write (for create and update operations)
		const data = $input.item.json.data || {};

		// Perform the requested operation
		switch (operation) {
			case 'create':
				// Create a new document with auto-generated ID
				if (documentId) {
					// Create with specific ID
					await db.collection(collectionName).doc(documentId).set(data);
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
				} else {
					// Create with auto-generated ID
					const docRef = await db.collection(collectionName).add(data);
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
				}

			case 'read':
				if (documentId) {
					// Read a specific document
					const doc = await db.collection(collectionName).doc(documentId).get();
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
				} else {
					// Read all documents in collection
					const snapshot = await db.collection(collectionName).get();
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

				await db.collection(collectionName).doc(documentId).update(data);
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

				await db.collection(collectionName).doc(documentId).delete();
				return [
					{
						json: {
							success: true,
							operation: 'delete',
							documentId: documentId,
						},
					},
				];

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
