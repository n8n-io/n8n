import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, jsonParse } from 'n8n-workflow';

import {
	fileFields,
	fileOperations,
	genieFields,
	genieOperations,
	sqlQueryFields,
	sqlQueryOperations,
	unityCatalogFields,
	unityCatalogOperations,
	vectorSearchFields,
	vectorSearchOperations,
} from './descriptions';
import { databricksApiRequest, pollUntilDone, sqlResultToObjects } from './GenericFunctions';

export class Databricks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Databricks',
		name: 'databricks',
		icon: 'file:databricks.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Databricks platform',
		defaults: {
			name: 'Databricks',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'databricksApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Genie',
						value: 'genie',
					},
					{
						name: 'SQL Query',
						value: 'sqlQuery',
					},
					{
						name: 'Unity Catalog',
						value: 'unityCatalog',
					},
					{
						name: 'Vector Search',
						value: 'vectorSearch',
					},
				],
				default: 'sqlQuery',
			},
			...sqlQueryOperations,
			...sqlQueryFields,
			...fileOperations,
			...fileFields,
			...genieOperations,
			...genieFields,
			...unityCatalogOperations,
			...unityCatalogFields,
			...vectorSearchOperations,
			...vectorSearchFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			let responseData: unknown;

			try {
				if (resource === 'sqlQuery') {
					// ================================================================
					//                          SQL QUERY
					// ================================================================

					if (operation === 'execute') {
						const warehouseId = this.getNodeParameter('warehouseId', i) as string;
						const statement = this.getNodeParameter('statement', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							warehouse_id: warehouseId,
							statement,
							wait_timeout: (additionalFields.waitTimeout as string) ?? '50s',
							on_wait_timeout: 'CONTINUE',
							disposition: 'INLINE',
							format: 'JSON_ARRAY',
						};

						if (additionalFields.catalog) {
							body.catalog = additionalFields.catalog;
						}
						if (additionalFields.schema) {
							body.schema = additionalFields.schema;
						}

						const result = (await databricksApiRequest.call(
							this,
							'POST',
							'/api/2.0/sql/statements',
							body,
						)) as IDataObject;

						let finalResult = result;

						const status = (result.status as IDataObject)?.state as string;
						if (status === 'PENDING' || status === 'RUNNING') {
							const statementId = result.statement_id as string;
							finalResult = (await pollUntilDone.call(
								this,
								async () => {
									const pollResponse = (await databricksApiRequest.call(
										this,
										'GET',
										`/api/2.0/sql/statements/${statementId}`,
									)) as IDataObject;
									return {
										state: (pollResponse.status as IDataObject)?.state as string,
										data: pollResponse,
									};
								},
								['SUCCEEDED', 'FAILED', 'CANCELED'],
								['FAILED', 'CANCELED'],
							)) as IDataObject;
						}

						// Convert to array of row objects
						const manifest = finalResult.manifest as IDataObject | undefined;
						const resultData = finalResult.result as IDataObject | undefined;

						if (manifest && resultData) {
							const columns =
								((manifest.schema as IDataObject)?.columns as Array<{ name: string }>) ?? [];
							const dataArray = (resultData.data_array as unknown[][]) ?? [];
							responseData = sqlResultToObjects(columns, dataArray);

							// Fetch remaining chunks if any
							let nextLink = resultData.next_chunk_internal_link as string | undefined;
							while (nextLink) {
								const chunkResponse = (await databricksApiRequest.call(
									this,
									'GET',
									nextLink,
								)) as IDataObject;
								const chunkRows = (chunkResponse.data_array as unknown[][]) ?? [];
								(responseData as IDataObject[]).push.apply(
									responseData as IDataObject[],
									sqlResultToObjects(columns, chunkRows),
								);
								nextLink = chunkResponse.next_chunk_internal_link as string | undefined;
							}
						} else {
							responseData = finalResult;
						}
					}
				} else if (resource === 'file') {
					// ================================================================
					//                            FILE
					// ================================================================

					if (operation === 'upload') {
						const path = this.getNodeParameter('path', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);

						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						await databricksApiRequest.call(
							this,
							'PUT',
							`/api/2.0/fs/files${path}`,
							buffer,
							{},
							// eslint-disable-next-line @typescript-eslint/naming-convention
							{ 'Content-Type': binaryData.mimeType ?? 'application/octet-stream' },
							{ encoding: null, json: false },
						);

						responseData = { success: true, path };
					} else if (operation === 'download') {
						const path = this.getNodeParameter('path', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);

						const buffer = (await databricksApiRequest.call(
							this,
							'GET',
							`/api/2.0/fs/files${path}`,
							{},
							{},
							{},
							{ encoding: null, json: false, returnFullResponse: false },
						)) as Buffer;

						const fileName = path.split('/').pop() ?? 'file';
						const newItem: INodeExecutionData = {
							json: items[i].json,
							binary: {},
						};

						newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(
							Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as unknown as ArrayBuffer),
							fileName,
						);

						returnData.push(newItem);
						continue;
					} else if (operation === 'delete') {
						const path = this.getNodeParameter('path', i) as string;
						await databricksApiRequest.call(this, 'DELETE', `/api/2.0/fs/files${path}`);
						responseData = { success: true, path };
					} else if (operation === 'getMetadata') {
						const path = this.getNodeParameter('path', i) as string;
						const response = (await databricksApiRequest.call(
							this,
							'HEAD',
							`/api/2.0/fs/files${path}`,
							{},
							{},
							{},
							{ returnFullResponse: true },
						)) as { headers: Record<string, string> };
						responseData = { path, ...response.headers };
					} else if (operation === 'listDir') {
						const path = this.getNodeParameter('path', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const qs: IDataObject = {};
						if (additionalFields.maxResults) {
							qs.max_results = additionalFields.maxResults;
						}
						if (additionalFields.pageToken) {
							qs.page_token = additionalFields.pageToken;
						}
						const dirPath = path.endsWith('/') ? path : `${path}/`;
						responseData = await databricksApiRequest.call(
							this,
							'GET',
							`/api/2.0/fs/files${dirPath}`,
							{},
							qs,
						);
					} else if (operation === 'createDir') {
						const path = this.getNodeParameter('path', i) as string;
						const dirPath = path.endsWith('/') ? path : `${path}/`;
						await databricksApiRequest.call(
							this,
							'PUT',
							`/api/2.0/fs/files${dirPath}`,
							{},
							{},
							{},
							{ json: false },
						);
						responseData = { success: true, path: dirPath };
					} else if (operation === 'deleteDir') {
						const path = this.getNodeParameter('path', i) as string;
						const dirPath = path.endsWith('/') ? path : `${path}/`;
						await databricksApiRequest.call(this, 'DELETE', `/api/2.0/fs/files${dirPath}`);
						responseData = { success: true, path: dirPath };
					}
				} else if (resource === 'genie') {
					// ================================================================
					//                            GENIE
					// ================================================================

					const spaceId = this.getNodeParameter('spaceId', i) as string;
					const baseUrl = `/api/2.0/genie/spaces/${spaceId}`;

					if (operation === 'startConversation') {
						const initialMessage = this.getNodeParameter('initialMessage', i) as string;

						const startResult = (await databricksApiRequest.call(
							this,
							'POST',
							`${baseUrl}/conversations`,
							{ initial_message: initialMessage },
						)) as IDataObject;

						const conversationId = startResult.conversation_id as string;
						const messageId = startResult.message_id as string;

						// Poll until message is complete
						const messageResult = (await pollUntilDone.call(
							this,
							async () => {
								const msg = (await databricksApiRequest.call(
									this,
									'GET',
									`${baseUrl}/conversations/${conversationId}/messages/${messageId}`,
								)) as IDataObject;
								return { state: msg.status as string, data: msg };
							},
							['COMPLETED', 'FAILED', 'CANCELLED'],
							['FAILED', 'CANCELLED'],
						)) as IDataObject;

						// If there are query attachments, fetch the first one automatically
						const attachments = messageResult.attachments as IDataObject[] | undefined;
						const queryAttachment = attachments?.find((a) => a.type === 'query');

						if (queryAttachment) {
							const attachmentId = queryAttachment.attachment_id as string;
							const queryResult = (await databricksApiRequest.call(
								this,
								'GET',
								`${baseUrl}/conversations/${conversationId}/messages/${messageId}/query-result/${attachmentId}`,
							)) as IDataObject;

							responseData = { ...messageResult, query_result: queryResult };
						} else {
							responseData = messageResult;
						}
					} else if (operation === 'createMessage') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						const content = this.getNodeParameter('content', i) as string;

						responseData = await databricksApiRequest.call(
							this,
							'POST',
							`${baseUrl}/conversations/${conversationId}/messages`,
							{ content },
						);
					} else if (operation === 'getMessage') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						const messageId = this.getNodeParameter('messageId', i) as string;

						responseData = await databricksApiRequest.call(
							this,
							'GET',
							`${baseUrl}/conversations/${conversationId}/messages/${messageId}`,
						);
					} else if (operation === 'executeSqlQuery') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						const messageId = this.getNodeParameter('messageId', i) as string;

						responseData = await databricksApiRequest.call(
							this,
							'POST',
							`${baseUrl}/conversations/${conversationId}/messages/${messageId}/execute-query`,
							{},
						);
					} else if (operation === 'getQueryResult') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						const messageId = this.getNodeParameter('messageId', i) as string;
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;

						responseData = await databricksApiRequest.call(
							this,
							'GET',
							`${baseUrl}/conversations/${conversationId}/messages/${messageId}/query-result/${attachmentId}`,
						);
					} else if (operation === 'getSpace') {
						responseData = await databricksApiRequest.call(this, 'GET', baseUrl);
					}
				} else if (resource === 'unityCatalog') {
					// ================================================================
					//                        UNITY CATALOG
					// ================================================================

					const entity = this.getNodeParameter('entity', i) as string;

					if (entity === 'catalog') {
						if (operation === 'create') {
							const name = this.getNodeParameter('name', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i);
							const body: IDataObject = { name };
							if (additionalFields.comment) body.comment = additionalFields.comment;

							responseData = await databricksApiRequest.call(
								this,
								'POST',
								'/api/2.1/unity-catalog/catalogs',
								body,
							);
						} else if (operation === 'get') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								`/api/2.1/unity-catalog/catalogs/${catalogName}`,
							);
						} else if (operation === 'getAll') {
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								'/api/2.1/unity-catalog/catalogs',
							);
							responseData = (responseData as IDataObject).catalogs ?? responseData;
						} else if (operation === 'update') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							const updateFields = this.getNodeParameter('updateFields', i);
							const body: IDataObject = {};
							if (updateFields.comment) body.comment = updateFields.comment;
							if (updateFields.newName) body.name = updateFields.newName;

							responseData = await databricksApiRequest.call(
								this,
								'PUT',
								`/api/2.1/unity-catalog/catalogs/${catalogName}`,
								body,
							);
						} else if (operation === 'delete') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							await databricksApiRequest.call(
								this,
								'DELETE',
								`/api/2.1/unity-catalog/catalogs/${catalogName}`,
							);
							responseData = { success: true };
						}
					} else if (entity === 'schema') {
						if (operation === 'create') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							const name = this.getNodeParameter('name', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i);
							const body: IDataObject = { catalog_name: catalogName, name };
							if (additionalFields.comment) body.comment = additionalFields.comment;

							responseData = await databricksApiRequest.call(
								this,
								'POST',
								'/api/2.1/unity-catalog/schemas',
								body,
							);
						} else if (operation === 'getAll') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								'/api/2.1/unity-catalog/schemas',
								{},
								{ catalog_name: catalogName },
							);
							responseData = (responseData as IDataObject).schemas ?? responseData;
						} else if (operation === 'get') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								`/api/2.1/unity-catalog/schemas/${fullName}`,
							);
						} else if (operation === 'update') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							const updateFields = this.getNodeParameter('updateFields', i);
							const body: IDataObject = {};
							if (updateFields.comment) body.comment = updateFields.comment;
							if (updateFields.newName) body.name = updateFields.newName;

							responseData = await databricksApiRequest.call(
								this,
								'PUT',
								`/api/2.1/unity-catalog/schemas/${fullName}`,
								body,
							);
						} else if (operation === 'delete') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							await databricksApiRequest.call(
								this,
								'DELETE',
								`/api/2.1/unity-catalog/schemas/${fullName}`,
							);
							responseData = { success: true };
						}
					} else if (entity === 'table') {
						if (operation === 'create') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							const schemaName = this.getNodeParameter('schemaName', i) as string;
							const name = this.getNodeParameter('name', i) as string;
							const tableType = this.getNodeParameter('tableType', i) as string;
							const dataSourceFormat = this.getNodeParameter('dataSourceFormat', i) as string;
							const columnsRaw = this.getNodeParameter('columns', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i);

							const columns = jsonParse<IDataObject[]>(columnsRaw, {
								errorMessage: "Invalid JSON in 'Columns' field",
							});

							const body: IDataObject = {
								catalog_name: catalogName,
								schema_name: schemaName,
								name,
								table_type: tableType,
								data_source_format: dataSourceFormat,
								columns,
							};
							if (additionalFields.comment) body.comment = additionalFields.comment;
							if (additionalFields.storageLocation)
								body.storage_location = additionalFields.storageLocation;

							responseData = await databricksApiRequest.call(
								this,
								'POST',
								'/api/2.1/unity-catalog/tables',
								body,
							);
						} else if (operation === 'getAll') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							const schemaName = this.getNodeParameter('schemaName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								'/api/2.1/unity-catalog/tables',
								{},
								{ catalog_name: catalogName, schema_name: schemaName },
							);
							responseData = (responseData as IDataObject).tables ?? responseData;
						} else if (operation === 'get') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								`/api/2.1/unity-catalog/tables/${fullName}`,
							);
						} else if (operation === 'delete') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							await databricksApiRequest.call(
								this,
								'DELETE',
								`/api/2.1/unity-catalog/tables/${fullName}`,
							);
							responseData = { success: true };
						}
					} else if (entity === 'volume') {
						if (operation === 'create') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							const schemaName = this.getNodeParameter('schemaName', i) as string;
							const name = this.getNodeParameter('name', i) as string;
							const volumeType = this.getNodeParameter('volumeType', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i);

							const body: IDataObject = {
								catalog_name: catalogName,
								schema_name: schemaName,
								name,
								volume_type: volumeType,
							};
							if (additionalFields.comment) body.comment = additionalFields.comment;
							if (additionalFields.storageLocation)
								body.storage_location = additionalFields.storageLocation;

							responseData = await databricksApiRequest.call(
								this,
								'POST',
								'/api/2.1/unity-catalog/volumes',
								body,
							);
						} else if (operation === 'getAll') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							const schemaName = this.getNodeParameter('schemaName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								'/api/2.1/unity-catalog/volumes',
								{},
								{ catalog_name: catalogName, schema_name: schemaName },
							);
							responseData = (responseData as IDataObject).volumes ?? responseData;
						} else if (operation === 'get') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								`/api/2.1/unity-catalog/volumes/${fullName}`,
							);
						} else if (operation === 'update') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							const updateFields = this.getNodeParameter('updateFields', i);
							const body: IDataObject = {};
							if (updateFields.comment) body.comment = updateFields.comment;
							if (updateFields.newName) body.name = updateFields.newName;

							responseData = await databricksApiRequest.call(
								this,
								'PUT',
								`/api/2.1/unity-catalog/volumes/${fullName}`,
								body,
							);
						} else if (operation === 'delete') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							await databricksApiRequest.call(
								this,
								'DELETE',
								`/api/2.1/unity-catalog/volumes/${fullName}`,
							);
							responseData = { success: true };
						}
					} else if (entity === 'function') {
						if (operation === 'create') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							const schemaName = this.getNodeParameter('schemaName', i) as string;
							const name = this.getNodeParameter('name', i) as string;
							const language = this.getNodeParameter('language', i) as string;
							const routineDefinition = this.getNodeParameter('routineDefinition', i) as string;
							const additionalFields = this.getNodeParameter('additionalFields', i);

							const body: IDataObject = {
								catalog_name: catalogName,
								schema_name: schemaName,
								name,
								language,
								routine_body: 'SQL',
								routine_definition: routineDefinition,
							};
							if (additionalFields.comment) body.comment = additionalFields.comment;
							if (additionalFields.inputParams) {
								body.input_params = jsonParse(additionalFields.inputParams as string, {
									errorMessage: "Invalid JSON in 'Input Parameters' field",
								});
							}
							if (additionalFields.returnParams) {
								body.return_params = jsonParse(additionalFields.returnParams as string, {
									errorMessage: "Invalid JSON in 'Return Parameters' field",
								});
							}

							responseData = await databricksApiRequest.call(
								this,
								'POST',
								'/api/2.1/unity-catalog/functions',
								body,
							);
						} else if (operation === 'getAll') {
							const catalogName = this.getNodeParameter('catalogName', i) as string;
							const schemaName = this.getNodeParameter('schemaName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								'/api/2.1/unity-catalog/functions',
								{},
								{ catalog_name: catalogName, schema_name: schemaName },
							);
							responseData = (responseData as IDataObject).functions ?? responseData;
						} else if (operation === 'get') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							responseData = await databricksApiRequest.call(
								this,
								'GET',
								`/api/2.1/unity-catalog/functions/${fullName}`,
							);
						} else if (operation === 'delete') {
							const fullName = this.getNodeParameter('fullName', i) as string;
							await databricksApiRequest.call(
								this,
								'DELETE',
								`/api/2.1/unity-catalog/functions/${fullName}`,
							);
							responseData = { success: true };
						}
					}
				} else if (resource === 'vectorSearch') {
					// ================================================================
					//                       VECTOR SEARCH
					// ================================================================

					if (operation === 'getAll') {
						const endpointName = this.getNodeParameter('endpointName', i) as string;
						responseData = await databricksApiRequest.call(
							this,
							'GET',
							`/api/2.0/vector-search/endpoints/${endpointName}/indexes`,
						);
						responseData = (responseData as IDataObject).vector_indexes ?? responseData;
					} else if (operation === 'get') {
						const indexName = this.getNodeParameter('indexName', i) as string;
						responseData = await databricksApiRequest.call(
							this,
							'GET',
							`/api/2.0/vector-search/indexes/${indexName}`,
						);
					} else if (operation === 'query') {
						const indexName = this.getNodeParameter('indexName', i) as string;
						const queryType = this.getNodeParameter('queryType', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							query_type: queryType,
							num_results: (additionalFields.numResults as number) ?? 10,
						};

						if (queryType === 'ann') {
							const queryVectorRaw = this.getNodeParameter('queryVector', i) as string;
							body.query_vector = jsonParse<number[]>(queryVectorRaw, {
								errorMessage: "Invalid JSON in 'Query Vector' field",
							});
						} else {
							body.query_text = this.getNodeParameter('queryText', i) as string;
						}

						if (additionalFields.columnsToReturn) {
							body.columns_to_return = (additionalFields.columnsToReturn as string)
								.split(',')
								.map((c: string) => c.trim())
								.filter(Boolean);
						}

						if (additionalFields.filters) {
							body.filters_json = additionalFields.filters;
						}

						const queryResult = (await databricksApiRequest.call(
							this,
							'POST',
							`/api/2.0/vector-search/indexes/${indexName}/query`,
							body,
						)) as IDataObject;

						// Convert result to row objects
						const resultObj = queryResult.result as IDataObject | undefined;
						if (resultObj) {
							const manifest = resultObj.manifest as IDataObject | undefined;
							const columns = (manifest?.columns as Array<{ name: string }>) ?? [];
							const dataArray = (resultObj.data_array as unknown[][]) ?? [];
							responseData = sqlResultToObjects(columns, dataArray);
						} else {
							responseData = queryResult;
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push.apply(
						returnData,
						this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: (error as Error).message }),
							{ itemData: { item: i } },
						),
					);
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		}

		return [returnData];
	}
}
