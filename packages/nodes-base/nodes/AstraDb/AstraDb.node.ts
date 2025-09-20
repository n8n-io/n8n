import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, LoggerProxy as Logger } from 'n8n-workflow';

import {
	connectAstraClient,
	validateAstraCredentials,
	validateKeyspaceCollectionName,
	validateQuery,
	insertOneDocument,
	insertManyDocuments,
	// insertWithVectorEmbeddings,
	// insertWithVectorize,
	updateDocuments,
	deleteDocuments,
	findDocuments,
	findOneDocument,
	findAndUpdateDocument,
	findAndReplaceDocument,
	findAndDeleteDocument,
	estimatedDocumentCount,
	formatAstraResponse,
	parseAstraOptions,
} from './GenericFunctions';
import { nodeProperties } from './AstraDbProperties';
import { generatePairedItemData } from '../../utils/utilities';

export class AstraDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Astra DB',
		name: 'astraDb',
		icon: 'file:astraDb.svg',
		group: ['input'],
		version: 1,
		description: 'Interact with DataStax Astra DB collections',
		defaults: {
			name: 'Astra DB',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'astraDb',
				required: true,
				testedBy: 'astraDbCredentialTest',
			},
		],
		properties: nodeProperties,
	};

	methods = {
		credentialTest: {
			async astraDbCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;

				try {
					// For credential test, we can't use this.getNode() so we'll create a mock node
					const mockNode = { name: 'Astra DB Test' } as any;
					const validatedCredentials = validateAstraCredentials(mockNode, credentials);
					const client = await connectAstraClient(validatedCredentials);

					// Test connection by getting database info
					client.db(validatedCredentials.endpoint, {
						token: validatedCredentials.token,
					});

					return {
						status: 'OK',
						message: 'Connection successful!',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: (error as Error).message,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('astraDb');
		const validatedCredentials = validateAstraCredentials(this.getNode(), credentials);
		const client = await connectAstraClient(validatedCredentials);
		let returnData: INodeExecutionData[] = [];

		try {
			const items = this.getInputData();
			const operation = this.getNodeParameter('operation', 0) as string;
			const collection = this.getNodeParameter('collection', 0) as string;
			const keyspace = this.getNodeParameter('keyspace', 0) as string;

			// Validate keyspace name
			validateKeyspaceCollectionName(this.getNode(), keyspace);
			// Validate collection name
			validateKeyspaceCollectionName(this.getNode(), collection);

			// Create db object with keyspace and token options
			const db = client.db(validatedCredentials.endpoint, {
				keyspace: keyspace,
				token: validatedCredentials.token,
			});

			// Create collection object
			const collectionObj = db.collection(collection);

			const itemsLength = items.length;
			const fallbackPairedItems = generatePairedItemData(items.length);

			// Handle different operations
			if (operation === 'insertOne') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const document = JSON.parse(this.getNodeParameter('document', i) as string);
						const result = await insertOneDocument(this.getNode(), collectionObj, document);

						returnData.push({
							json: formatAstraResponse(result, 'insertOne'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'insertMany') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const documents = JSON.parse(this.getNodeParameter('documents', i) as string);
						const options = parseAstraOptions(
							this.getNode(),
							this.getNodeParameter('options', i, {}),
						);

						const result = await insertManyDocuments(
							this.getNode(),
							collectionObj,
							documents,
							options,
						);

						returnData.push({
							json: formatAstraResponse(result, 'insertMany'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			/*if (operation === 'insertWithVectorEmbeddings') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const document = JSON.parse(this.getNodeParameter('document', i) as string);
						const result = await insertWithVectorEmbeddings(this.getNode(), collectionObj, document);
						
						returnData.push({
							json: formatAstraResponse(result, 'insertWithVectorEmbeddings'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'insertWithVectorize') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const document = JSON.parse(this.getNodeParameter('document', i) as string);
						const result = await insertWithVectorize(this.getNode(), collectionObj, document);
						
						returnData.push({
							json: formatAstraResponse(result, 'insertWithVectorize'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}*/

			if (operation === 'updateMany') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const filter = JSON.parse(this.getNodeParameter('filter', i) as string);
						const update = JSON.parse(this.getNodeParameter('update', i) as string);
						const options = parseAstraOptions(
							this.getNode(),
							this.getNodeParameter('options', i, {}),
						);

						validateQuery(this.getNode(), filter);
						validateQuery(this.getNode(), update);

						const result = await updateDocuments(
							this.getNode(),
							collectionObj,
							filter,
							update,
							options,
						);

						returnData.push({
							json: formatAstraResponse(result, 'updateMany'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'delete') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const filter = JSON.parse(this.getNodeParameter('filter', i) as string);
						validateQuery(this.getNode(), filter);

						const result = await deleteDocuments(this.getNode(), collectionObj, filter);

						returnData.push({
							json: formatAstraResponse(result, 'delete'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'findMany') {
				Logger.debug(
					`Finding documents in keyspace '${keyspace}' and collection '${collection}' with itemsLength: ${itemsLength}`,
				);
				for (let i = 0; i < itemsLength; i++) {
					try {
						const filter = JSON.parse(this.getNodeParameter('filter', i) as string);
						const options = parseAstraOptions(
							this.getNode(),
							this.getNodeParameter('options', i, {}),
						);

						validateQuery(this.getNode(), filter);

						const result = await findDocuments(this.getNode(), collectionObj, filter, options);

						// Return each document as a separate item
						for (const document of result.documents) {
							returnData.push({
								json: document,
								pairedItem: fallbackPairedItems[i],
							});
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'findOne') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const filter = JSON.parse(this.getNodeParameter('filter', i) as string);
						const options = parseAstraOptions(
							this.getNode(),
							this.getNodeParameter('options', i, {}),
						);

						validateQuery(this.getNode(), filter);

						const result = await findOneDocument(this.getNode(), collectionObj, filter, options);

						returnData.push({
							json: result || {},
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'findAndUpdate') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const filter = JSON.parse(this.getNodeParameter('filter', i) as string);
						const update = JSON.parse(this.getNodeParameter('update', i) as string);
						// const upsert = this.getNodeParameter('upsert', i, false) as boolean;
						// const returnDocument = this.getNodeParameter('returnDocument', i, 'after') as 'before' | 'after';
						const options = parseAstraOptions(
							this.getNode(),
							this.getNodeParameter('options', i, {}),
						);

						validateQuery(this.getNode(), filter);
						validateQuery(this.getNode(), update);

						// const findAndUpdateOptions = {
						// 	upsert,
						// 	returnDocument,
						// 	...options,
						// };

						const result = await findAndUpdateDocument(
							this.getNode(),
							collectionObj,
							filter,
							update,
							options /*findAndUpdateOptions*/,
						);

						returnData.push({
							json: formatAstraResponse(result, 'findAndUpdate'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'findAndReplace') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const filter = JSON.parse(this.getNodeParameter('filter', i) as string);
						const replacement = JSON.parse(this.getNodeParameter('replacement', i) as string);
						// const upsert = this.getNodeParameter('upsert', i, false) as boolean;
						// const returnDocument = this.getNodeParameter('returnDocument', i, 'after') as 'before' | 'after';
						const options = parseAstraOptions(
							this.getNode(),
							this.getNodeParameter('options', i, {}),
						);

						validateQuery(this.getNode(), filter);
						validateQuery(this.getNode(), replacement);

						// const findAndReplaceOptions = {
						// 	upsert,
						// 	returnDocument,
						// 	...options,
						// };

						const result = await findAndReplaceDocument(
							this.getNode(),
							collectionObj,
							filter,
							replacement,
							options /*findAndReplaceOptions*/,
						);

						returnData.push({
							json: formatAstraResponse(result, 'findAndReplace'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'findAndDelete') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const filter = JSON.parse(this.getNodeParameter('filter', i) as string);
						const options = parseAstraOptions(
							this.getNode(),
							this.getNodeParameter('options', i, {}),
						);

						validateQuery(this.getNode(), filter);

						const result = await findAndDeleteDocument(
							this.getNode(),
							collectionObj,
							filter,
							options,
						);

						returnData.push({
							json: formatAstraResponse(result, 'findAndDelete'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'estimatedDocumentCount') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const options = parseAstraOptions(
							this.getNode(),
							this.getNodeParameter('options', i, {}),
						);

						const result = await estimatedDocumentCount(this.getNode(), collectionObj, options);

						returnData.push({
							json: formatAstraResponse(result, 'estimatedDocumentCount'),
							pairedItem: fallbackPairedItems[i],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: (error as JsonObject).message },
								pairedItem: fallbackPairedItems[i],
							});
							continue;
						}
						throw error;
					}
				}
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as JsonObject).message },
					pairedItem: [{ item: 0 }],
				});
			} else {
				throw error;
			}
		}

		return [returnData];
	}
}
