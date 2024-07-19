import {
	INodeType,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	IPairedItemData,
	INodeTypeDescription,
	IExecuteFunctions,
} from 'n8n-workflow';

import {
	Bucket,
	Cluster,
	Collection,
	connect,
	GetResult,
	MutationResult,
	PingResult,
	QueryResult,
} from 'couchbase';

import { nodeProperties as couchbaseProperties } from './CouchbaseProperties';

export class Couchbase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Couchbase',
		name: 'couchbase',
		icon: 'file:CBLogomark.svg',
		group: ['input'],
		version: 1,
		description: 'Couchbase Node to add, update and delete data from couchbase',
		defaults: {
			name: 'Couchbase',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'couchbaseApi',
				required: true,
				testedBy: 'couchbaseCredentialTest',
			},
		],
		properties: couchbaseProperties,
	};

	methods = {
		credentialTest: {
			async couchbaseCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;

				try {
					const connectionString = credentials.CouchbaseConnection as string;
					const username = credentials.CouchbaseUsername as string;
					const password = credentials.CouchbasePassword as string;

					const cluster = await connect(connectionString, {
						username: username,
						password: password,
						configProfile: 'wanDevelopment',
					});
					const ping: PingResult = await cluster.ping();
					console.log('Couchbase Ping result');
					console.log(ping.sdk, ping.services);
					await cluster.close();
				} catch (error) {
					return {
						status: 'Error',
						message: (error as Error).message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const uuid = require('uuid');
		// Couchbase Credentials
		console.log('Couchbase Node Execution Started');
		const credentials = await this.getCredentials('couchbaseApi');
		const connectionString = credentials.CouchbaseConnection as string;
		const username = credentials.CouchbaseUsername as string;
		const password = credentials.CouchbasePassword as string;
		const bucketName = this.getNodeParameter('bucket', 0, 'default') as string;
		const scopeName = this.getNodeParameter('scope', 0, '_default') as string;
		const collectionName = this.getNodeParameter('collection', 0, '_default') as string;
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		let cluster: Cluster;
		let collection: Collection;
		try {
			// Connecting to the database
			cluster = await connect(connectionString, {
				username: username,
				password: password,
				configProfile: 'wanDevelopment',
			});
			const bucket: Bucket = cluster.bucket(bucketName);
			collection = bucket.scope(scopeName).collection(collectionName);
		} catch (error) {
			throw error;
		}

		let item: INodeExecutionData;
		let myDocument: string;
		let myNewQuery: string;
		let readJson: string;

		const returnItems: INodeExecutionData[] = [];
		let responseData: IDataObject | IDataObject[] = [];

		if (operation === 'insert') {
			// Expressiong for getting the value in the input field
			myDocument = this.getNodeParameter('myDocument', 0, '') as string;
			const options = this.getNodeParameter('options', 0);
			const specified = options.specified as string;
			const generate = options.generate as boolean;
			// Statement either the user choose to generate or specify the ID
			let id: string;
			if (generate == true) {
				id = uuid.v4();
			} else {
				id = specified.trim();
			}
			await collection.insert(id, myDocument);

			responseData = [{ id: id, value: myDocument }];
		} else if (operation === 'update') {
			myDocument = this.getNodeParameter('myDocument', 0, '') as string;
			const value  = this.getNodeParameter('myValue', 0, '') as string;
			await collection.upsert(myDocument, value);
			responseData = [{ id: myDocument, value: value }];
		} else if (operation === 'remove') {
			const documentId = this.getNodeParameter('documentId', 0, '') as string;
			const removeResult: MutationResult = await collection.remove(documentId);
			responseData = [{ id: documentId, value: removeResult }];
		} else if (operation === 'find') {
			// Operation (get) to retrieve a document in Couchbase
			const documentId = this.getNodeParameter('documentId', 0, '') as string;
			const getResult: GetResult = await collection.get(documentId);
			console.log('Get Result:', getResult);
			readJson = JSON.stringify(getResult.content);
			console.log(`Get Result in String: ${readJson}`);
			responseData = [{ id: documentId, value: readJson }];
		} else if (operation === 'query') {
			// Perform a N1QL Query
			myNewQuery = this.getNodeParameter('query', 0, '') as string;
			const queryResult: QueryResult = await cluster.query(myNewQuery);
			console.log('Query Results:');
			queryResult.rows.forEach((row) => {
				console.log(row);
			});
			// Converting Json to String
			readJson = JSON.stringify(queryResult.rows);
			console.log(`Get Result as String: ${readJson}`);
			responseData = queryResult.rows;
		} else if (operation === 'import') {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				item = items[itemIndex];
				const id = uuid.v4();
				await collection.insert(id, item);
			}
		}

		// } catch (error) {
		// 	// This node should never fail but we want to showcase how
		// 	// to handle errors.
		// 	if (this.continueOnFail()) {
		// 		items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
		// 	} else {
		// 		// Adding `itemIndex` allows other workflows to handle this error
		// 		if (error.context) {
		// 			// If the error thrown already contains the context property,
		// 			// only append the itemIndex
		// 			error.context.itemIndex = itemIndex;
		// 			throw error;
		// 		}
		// 		throw new NodeOperationError(this.getNode(), error, {
		// 			itemIndex,
		// 		});
		// 	}
		// }

		await cluster.close();

		const itemData = generatePairedItemData(items.length);

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData),
			{ itemData },
		);

		returnItems.push(...executionData);

		return [returnItems];
		// return this.prepareOutputData(responseData);
	}
}

function generatePairedItemData(length: number): IPairedItemData[] {
	return Array.from({ length }, (_, item) => ({
		item,
	}));
}
