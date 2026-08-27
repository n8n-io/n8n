import type {
	FindOneAndReplaceOptions,
	FindOneAndUpdateOptions,
	UpdateOptions,
	Sort,
	MongoClient,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import { NodeConnectionTypes, NodeOperationError, UserError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';

import { parseAndResolveQueryParameters } from '@utils/query-parameters';

import {
	buildParameterizedConnString,
	connectDocumentDatabaseClient,
	prepareFields,
	prepareItems,
	sanitizeDocumentDatabaseUriInMessage,
	serializeDocumentDatabaseItems,
	stringifyObjectIDs,
	validateAndResolveDocumentDatabaseCredentials,
} from './GenericFunctions';
import type { IDocumentDatabaseParametricCredentials } from './documentDb.types';
import { documentDbNodeProperties } from './DocumentDbProperties';
import { generatePairedItemData } from '../../utils/utilities';

export class DocumentDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DocumentDB',
		name: 'documentDb',
		icon: 'file:documentdb.png',
		group: ['input'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
		description: 'Find, insert and update documents in DocumentDB',
		defaults: {
			name: 'DocumentDB',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'documentDbApi',
				required: true,
				testedBy: 'documentDbCredentialTest',
			},
		],
		properties: documentDbNodeProperties,
	};

	methods = {
		credentialTest: {
			async documentDbCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;
				let connectionString = '';

				try {
					const database = ((credentials.database as string) || '').trim();

					if (credentials.configurationType === 'connectionString') {
						connectionString = ((credentials.connectionString as string) || '').trim();
					} else {
						connectionString = buildParameterizedConnString(
							credentials as unknown as IDocumentDatabaseParametricCredentials,
						);
					}

					// Note: ICredentialTestFunctions doesn't have a way to get the Node instance
					// so we set the version to 0
					const client = await connectDocumentDatabaseClient(connectionString, 0, credentials);

					const { databases } = await client.db().admin().listDatabases();

					if (!(databases as IDataObject[]).map((db) => db.name).includes(database)) {
						throw new UserError(`Database "${database}" does not exist`, {
							level: 'warning',
						});
					}
					await client.close();
				} catch (error) {
					return {
						status: 'Error',
						message: sanitizeDocumentDatabaseUriInMessage(error, connectionString),
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
		const credentials = await this.getCredentials('documentDbApi');
		const node = this.getNode();
		const { database, connectionString } = validateAndResolveDocumentDatabaseCredentials(
			node,
			credentials,
		);
		const nodeVersion = node.typeVersion;
		const sanitizeErrorMessage = (error: unknown) =>
			sanitizeDocumentDatabaseUriInMessage(error, connectionString);
		let client: MongoClient;
		try {
			client = await connectDocumentDatabaseClient(connectionString, nodeVersion, credentials);
		} catch (error) {
			throw new NodeOperationError(node, sanitizeErrorMessage(error));
		}
		let returnData: INodeExecutionData[] = [];

		try {
			const mdb = client.db(database);

			const items = this.getInputData();
			const operation = this.getNodeParameter('operation', 0);

			let itemsLength = items.length ? 1 : 0;
			let fallbackPairedItems: IPairedItemData[] | null = null;

			if (nodeVersion >= 1.1) {
				itemsLength = items.length;
			} else {
				fallbackPairedItems = generatePairedItemData(items.length);
			}

			if (operation === 'aggregate') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const queryParameter = parseAndResolveQueryParameters(
							this.getNodeParameter('query', i) as string,
							this.getNodeParameter('queryParameters', i, '[]'),
							node,
							i,
						) as IDataObject;

						if (queryParameter._id && typeof queryParameter._id === 'string') {
							queryParameter._id = new ObjectId(queryParameter._id);
						}

						const query = mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.aggregate(queryParameter as unknown as Document[]);

						for (const entry of await query.toArray()) {
							returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
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
						const queryParameter = parseAndResolveQueryParameters(
							this.getNodeParameter('query', i) as string,
							this.getNodeParameter('queryParameters', i, '[]'),
							node,
							i,
						) as Document;
						const { deletedCount } = await mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.deleteMany(queryParameter);

						returnData.push({
							json: { deletedCount },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'find') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const queryParameter = parseAndResolveQueryParameters(
							this.getNodeParameter('query', i) as string,
							this.getNodeParameter('queryParameters', i, '[]'),
							node,
							i,
						) as IDataObject;

						if (queryParameter._id && typeof queryParameter._id === 'string') {
							queryParameter._id = new ObjectId(queryParameter._id);
						}

						let query = mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.find(queryParameter as unknown as Document);

						const options = this.getNodeParameter('options', i);
						const limit = options.limit as number;
						const skip = options.skip as number;
						const projection =
							options.projection && (JSON.parse(options.projection as string) as Document);
						const sort = options.sort && (JSON.parse(options.sort as string) as Sort);

						if (skip > 0) {
							query = query.skip(skip);
						}
						if (limit > 0) {
							query = query.limit(limit);
						}
						if (sort && Object.keys(sort).length !== 0 && sort.constructor === Object) {
							query = query.sort(sort);
						}

						if (
							projection &&
							Object.keys(projection).length !== 0 &&
							projection.constructor === Object
						) {
							query = query.project(projection);
						}

						const queryResult = await query.toArray();

						for (const entry of queryResult) {
							returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'findOneAndReplace') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				if (nodeVersion >= 1.3) {
					for (let i = 0; i < itemsLength; i++) {
						const fields = prepareFields(this.getNodeParameter('fields', i) as string);
						const useDotNotation = this.getNodeParameter(
							'options.useDotNotation',
							i,
							false,
						) as boolean;
						const dateFields = prepareFields(
							this.getNodeParameter('options.dateFields', i, '') as string,
						);
						const updateKey = ((this.getNodeParameter('updateKey', i) as string) || '').trim();
						const updateOptions = (this.getNodeParameter('upsert', i) as boolean)
							? { upsert: true }
							: undefined;

						try {
							const [item] = prepareItems({
								items: [items[i]],
								fields,
								updateKey,
								useDotNotation,
								dateFields,
								node: this.getNode(),
							});

							if (!item) {
								throw new NodeOperationError(
									this.getNode(),
									'Item is missing the updateKey field',
									{ itemIndex: i },
								);
							}

							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', i) as string)
								.findOneAndReplace(filter, item, updateOptions as FindOneAndReplaceOptions);

							returnData.push({ json: item, pairedItem: { item: i } });
						} catch (error) {
							if (this.continueOnFail()) {
								returnData.push({
									json: { error: sanitizeErrorMessage(error) },
									pairedItem: { item: i },
								});
								continue;
							}
							throw error;
						}
					}
				} else {
					const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
					const useDotNotation = this.getNodeParameter(
						'options.useDotNotation',
						0,
						false,
					) as boolean;
					const dateFields = prepareFields(
						this.getNodeParameter('options.dateFields', 0, '') as string,
					);

					const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

					const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
						? { upsert: true }
						: undefined;

					const updateItems = prepareItems({
						items,
						fields,
						updateKey,
						useDotNotation,
						dateFields,
						node: this.getNode(),
					});

					for (const item of updateItems) {
						try {
							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', 0) as string)
								.findOneAndReplace(filter, item, updateOptions as FindOneAndReplaceOptions);
						} catch (error) {
							if (this.continueOnFail()) {
								item.json = { error: sanitizeErrorMessage(error) };
								continue;
							}
							throw error;
						}
					}

					returnData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(updateItems),
						{ itemData: fallbackPairedItems },
					);
				}
			}

			if (operation === 'findOneAndUpdate') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				if (nodeVersion >= 1.3) {
					for (let i = 0; i < itemsLength; i++) {
						const fields = prepareFields(this.getNodeParameter('fields', i) as string);
						const useDotNotation = this.getNodeParameter(
							'options.useDotNotation',
							i,
							false,
						) as boolean;
						const dateFields = prepareFields(
							this.getNodeParameter('options.dateFields', i, '') as string,
						);
						const updateKey = ((this.getNodeParameter('updateKey', i) as string) || '').trim();
						const updateOptions = (this.getNodeParameter('upsert', i) as boolean)
							? { upsert: true }
							: undefined;

						try {
							const [item] = prepareItems({
								items: [items[i]],
								fields,
								updateKey,
								useDotNotation,
								dateFields,
								isUpdate: true,
								node: this.getNode(),
							});

							if (!item) {
								throw new NodeOperationError(
									this.getNode(),
									'Item is missing the updateKey field',
									{ itemIndex: i },
								);
							}

							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', i) as string)
								.findOneAndUpdate(filter, { $set: item }, updateOptions as FindOneAndUpdateOptions);

							returnData.push({ json: item, pairedItem: { item: i } });
						} catch (error) {
							if (this.continueOnFail()) {
								returnData.push({
									json: { error: sanitizeErrorMessage(error) },
									pairedItem: { item: i },
								});
								continue;
							}
							throw error;
						}
					}
				} else {
					const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
					const useDotNotation = this.getNodeParameter(
						'options.useDotNotation',
						0,
						false,
					) as boolean;
					const dateFields = prepareFields(
						this.getNodeParameter('options.dateFields', 0, '') as string,
					);

					const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

					const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
						? { upsert: true }
						: undefined;

					const updateItems = prepareItems({
						items,
						fields,
						updateKey,
						useDotNotation,
						dateFields,
						isUpdate: nodeVersion >= 1.2,
						node: this.getNode(),
					});

					for (const item of updateItems) {
						try {
							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', 0) as string)
								.findOneAndUpdate(filter, { $set: item }, updateOptions as FindOneAndUpdateOptions);
						} catch (error) {
							if (this.continueOnFail()) {
								item.json = { error: sanitizeErrorMessage(error) };
								continue;
							}
							throw error;
						}
					}

					returnData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(updateItems),
						{ itemData: fallbackPairedItems },
					);
				}
			}

			if (operation === 'insert') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				if (nodeVersion >= 1.3) {
					// Phase 1: prepare items and group by collection name
					const groups = new Map<string, Array<{ item: IDataObject; originalIndex: number }>>();

					for (let i = 0; i < itemsLength; i++) {
						try {
							const fields = prepareFields(this.getNodeParameter('fields', i) as string);
							const useDotNotation = this.getNodeParameter(
								'options.useDotNotation',
								i,
								false,
							) as boolean;
							const dateFields = prepareFields(
								this.getNodeParameter('options.dateFields', i, '') as string,
							);
							const [insertItem] = prepareItems({
								items: [items[i]],
								fields,
								updateKey: '',
								useDotNotation,
								dateFields,
								node: this.getNode(),
							});

							if (!insertItem) continue;

							const collection = this.getNodeParameter('collection', i) as string;
							const group = groups.get(collection) ?? [];
							groups.set(collection, group);
							group.push({ item: insertItem, originalIndex: i });
						} catch (error) {
							if (this.continueOnFail()) {
								returnData.push({
									json: { error: sanitizeErrorMessage(error) },
									pairedItem: { item: i },
								});
							} else {
								throw error;
							}
						}
					}

					// Phase 2: insertMany per collection group
					for (const [collection, groupItems] of groups) {
						try {
							const { insertedIds } = await mdb
								.collection(collection)
								.insertMany(groupItems.map((g) => g.item));

							for (let idx = 0; idx < groupItems.length; idx++) {
								const g = groupItems[idx];
								returnData.push({
									json: { ...g.item, id: insertedIds[idx] as unknown as string },
									pairedItem: { item: g.originalIndex },
								});
							}
						} catch (error) {
							if (this.continueOnFail()) {
								for (const g of groupItems) {
									returnData.push({
										json: { error: sanitizeErrorMessage(error) },
										pairedItem: { item: g.originalIndex },
									});
								}
								continue;
							}
							throw error;
						}
					}

					returnData.sort((a, b) => {
						const aIdx = (a.pairedItem as { item: number }).item;
						const bIdx = (b.pairedItem as { item: number }).item;
						return aIdx - bIdx;
					});
				} else {
					let responseData: IDataObject[] = [];
					try {
						// Prepare the data to insert and copy it to be returned
						const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
						const useDotNotation = this.getNodeParameter(
							'options.useDotNotation',
							0,
							false,
						) as boolean;
						const dateFields = prepareFields(
							this.getNodeParameter('options.dateFields', 0, '') as string,
						);

						const insertItems = prepareItems({
							items,
							fields,
							updateKey: '',
							useDotNotation,
							dateFields,
							node: this.getNode(),
						});

						const { insertedIds } = await mdb
							.collection(this.getNodeParameter('collection', 0) as string)
							.insertMany(insertItems);

						// Add the id to the data
						for (const i of Object.keys(insertedIds)) {
							responseData.push({
								...insertItems[parseInt(i, 10)],
								id: insertedIds[parseInt(i, 10)] as unknown as string,
							});
						}
					} catch (error) {
						if (this.continueOnFail()) {
							responseData = [{ error: sanitizeErrorMessage(error) }];
						} else {
							throw error;
						}
					}

					returnData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: fallbackPairedItems },
					);
				}
			}

			if (operation === 'update') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				if (nodeVersion >= 1.3) {
					for (let i = 0; i < itemsLength; i++) {
						const fields = prepareFields(this.getNodeParameter('fields', i) as string);
						const useDotNotation = this.getNodeParameter(
							'options.useDotNotation',
							i,
							false,
						) as boolean;
						const dateFields = prepareFields(
							this.getNodeParameter('options.dateFields', i, '') as string,
						);
						const updateKey = ((this.getNodeParameter('updateKey', i) as string) || '').trim();
						const updateOptions = (this.getNodeParameter('upsert', i) as boolean)
							? { upsert: true }
							: undefined;

						try {
							const [item] = prepareItems({
								items: [items[i]],
								fields,
								updateKey,
								useDotNotation,
								dateFields,
								isUpdate: true,
								node: this.getNode(),
							});

							if (!item) {
								throw new NodeOperationError(
									this.getNode(),
									'Item is missing the updateKey field',
									{ itemIndex: i },
								);
							}

							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', i) as string)
								.updateOne(filter, { $set: item }, updateOptions as UpdateOptions);

							returnData.push({ json: item, pairedItem: { item: i } });
						} catch (error) {
							if (this.continueOnFail()) {
								returnData.push({
									json: { error: sanitizeErrorMessage(error) },
									pairedItem: { item: i },
								});
								continue;
							}
							throw error;
						}
					}
				} else {
					const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
					const useDotNotation = this.getNodeParameter(
						'options.useDotNotation',
						0,
						false,
					) as boolean;
					const dateFields = prepareFields(
						this.getNodeParameter('options.dateFields', 0, '') as string,
					);

					const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

					const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
						? { upsert: true }
						: undefined;

					const updateItems = prepareItems({
						items,
						fields,
						updateKey,
						useDotNotation,
						dateFields,
						isUpdate: nodeVersion >= 1.2,
						node: this.getNode(),
					});

					for (const item of updateItems) {
						try {
							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', 0) as string)
								.updateOne(filter, { $set: item }, updateOptions as UpdateOptions);
						} catch (error) {
							if (this.continueOnFail()) {
								item.json = { error: sanitizeErrorMessage(error) };
								continue;
							}
							throw error;
						}
					}

					returnData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(updateItems),
						{ itemData: fallbackPairedItems },
					);
				}
			}

			if (operation === 'listVectorIndexes') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = (this.getNodeParameter('indexName', i) as string).trim();
						const indexes = await mdb.collection(collection).listIndexes().toArray();
						const vectorIndexes = indexes.filter((index) => {
							const isVectorIndex = Object.values(index.key).includes('cosmosSearch');
							return isVectorIndex && (!indexName || index.name === indexName);
						});
						const result = vectorIndexes.map((json) => ({
							json,
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						}));
						returnData.push(...result);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'dropVectorIndex') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = this.getNodeParameter('indexNameRequired', i) as string;

						await mdb.collection(collection).dropIndex(indexName);
						returnData.push({
							json: {
								[indexName]: true,
							},
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'createVectorIndex') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = this.getNodeParameter('indexNameRequired', i) as string;
						const vectorField = this.getNodeParameter('vectorField', i) as string;
						const indexKind = this.getNodeParameter('indexKind', i) as string;
						const cosmosSearchOptions: IDataObject = {
							kind: indexKind,
							similarity: this.getNodeParameter('similarity', i) as string,
							dimensions: this.getNodeParameter('dimensions', i) as number,
						};
						if (indexKind === 'vector-hnsw') {
							cosmosSearchOptions.m = this.getNodeParameter('m', i) as number;
							cosmosSearchOptions.efConstruction = this.getNodeParameter(
								'efConstruction',
								i,
							) as number;
						} else {
							cosmosSearchOptions.numLists = this.getNodeParameter('numLists', i) as number;
						}

						await mdb.command({
							createIndexes: collection,
							indexes: [
								{
									name: indexName,
									key: { [vectorField]: 'cosmosSearch' },
									cosmosSearchOptions,
								},
							],
						});

						returnData.push({
							json: { indexName },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}
		} catch (error) {
			const sanitizedMessage = sanitizeErrorMessage(error);
			if (error instanceof Error && sanitizedMessage === error.message) throw error;

			throw new NodeOperationError(node, sanitizedMessage);
		} finally {
			await client.close().catch(() => {});
		}

		if (nodeVersion >= 1.4) {
			return [await serializeDocumentDatabaseItems.call(this, returnData)];
		}

		return [stringifyObjectIDs(returnData)];
	}
}
