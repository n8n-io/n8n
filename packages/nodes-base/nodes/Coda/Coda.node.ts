import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';

import { controlFields, controlOperations } from './ControlDescription';
import { formulaFields, formulaOperations } from './FormulaDescription';
import { codaApiRequest, codaApiRequestAllItems } from './GenericFunctions';
import { tableFields, tableOperations } from './TableDescription';
import { viewFields, viewOperations } from './ViewDescription';

export class Coda implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Coda',
		name: 'coda',
		icon: 'file:coda.svg',
		group: ['output'],
		version: [1, 1.1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Coda API',
		defaults: {
			name: 'Coda',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'codaApi',
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
						name: 'Control',
						value: 'control',
						description:
							'Controls provide a user-friendly way to input a value that can affect other parts of the doc',
					},
					{
						name: 'Formula',
						value: 'formula',
						description: 'Formulas can be great for performing one-off computations',
					},
					{
						name: 'Table',
						value: 'table',
						description: 'Access data of tables in documents',
					},
					{
						name: 'View',
						value: 'view',
						description: 'Access data of views in documents',
					},
				],
				default: 'table',
			},
			...tableOperations,
			...tableFields,
			...formulaOperations,
			...formulaFields,
			...controlOperations,
			...controlFields,
			...viewOperations,
			...viewFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available docs to display them to user so that they can
			// select them easily
			async getDocs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {};
				const docs = await codaApiRequestAllItems.call(this, 'items', 'GET', '/docs', {}, qs);
				for (const doc of docs) {
					const docName = doc.name;
					const docId = doc.id;
					returnData.push({
						name: docName,
						value: docId,
					});
				}
				return returnData;
			},
			// Get all the available tables to display them to user so that they can
			// select them easily
			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const docId = this.getCurrentNodeParameter('docId');

				const tables = await codaApiRequestAllItems.call(
					this,
					'items',
					'GET',
					`/docs/${docId}/tables`,
					{},
				);
				for (const table of tables) {
					const tableName = table.name;
					const tableId = table.id;
					returnData.push({
						name: tableName,
						value: tableId,
					});
				}
				return returnData;
			},
			// Get all the available columns to display them to user so that they can
			// select them easily
			async getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const docId = this.getCurrentNodeParameter('docId');
				const tableId = this.getCurrentNodeParameter('tableId');

				const columns = await codaApiRequestAllItems.call(
					this,
					'items',
					'GET',
					`/docs/${docId}/tables/${tableId}/columns`,
					{},
				);
				for (const column of columns) {
					const columnName = column.name;
					const columnId = column.id;
					returnData.push({
						name: columnName,
						value: columnId,
					});
				}
				return returnData;
			},
			// Get all the available views to display them to user so that they can
			// select them easily
			async getViews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const docId = this.getCurrentNodeParameter('docId');
				const views = await codaApiRequestAllItems.call(
					this,
					'items',
					'GET',
					`/docs/${docId}/tables?tableTypes=view`,
					{},
				);
				for (const view of views) {
					const viewName = view.name;
					const viewId = view.id;
					returnData.push({
						name: viewName,
						value: viewId,
					});
				}
				return returnData;
			},
			// Get all the available formulas to display them to user so that they can
			// select them easily
			async getFormulas(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const docId = this.getCurrentNodeParameter('docId');
				const formulas = await codaApiRequestAllItems.call(
					this,
					'items',
					'GET',
					`/docs/${docId}/formulas`,
					{},
				);
				for (const formula of formulas) {
					const formulaName = formula.name;
					const formulaId = formula.id;
					returnData.push({
						name: formulaName,
						value: formulaId,
					});
				}
				return returnData;
			},
			// Get all the available view rows to display them to user so that they can
			// select them easily
			async getViewRows(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const docId = this.getCurrentNodeParameter('docId');
				const viewId = this.getCurrentNodeParameter('viewId');
				const viewRows = await codaApiRequestAllItems.call(
					this,
					'items',
					'GET',
					`/docs/${docId}/tables/${viewId}/rows`,
					{},
				);
				for (const viewRow of viewRows) {
					const viewRowName = viewRow.name;
					const viewRowId = viewRow.id;
					returnData.push({
						name: viewRowName,
						value: viewRowId,
					});
				}
				return returnData;
			},
			// Get all the available view columns to display them to user so that they can
			// select them easily
			async getViewColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const docId = this.getCurrentNodeParameter('docId');
				const viewId = this.getCurrentNodeParameter('viewId');

				const viewColumns = await codaApiRequestAllItems.call(
					this,
					'items',
					'GET',
					`/docs/${docId}/tables/${viewId}/columns`,
					{},
				);
				for (const viewColumn of viewColumns) {
					const viewColumnName = viewColumn.name;
					const viewColumnId = viewColumn.id;
					returnData.push({
						name: viewColumnName,
						value: viewColumnId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const nodeVersion = this.getNode().typeVersion;
		const returnData: INodeExecutionData[] = [];
		const items = this.getInputData();
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		let qs: IDataObject = {};
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'table') {
			// https://coda.io/developers/apis/v1beta1#operation/upsertRows
			if (operation === 'createRow') {
				try {
					const sendData = {} as IDataObject;
					for (let i = 0; i < items.length; i++) {
						qs = {};
						const docId = this.getNodeParameter('docId', i) as string;
						const tableId = this.getNodeParameter('tableId', i) as string;
						const options = this.getNodeParameter('options', i);
						const endpoint = `/docs/${docId}/tables/${tableId}/rows`;

						if (options.disableParsing) {
							qs.disableParsing = options.disableParsing as boolean;
						}

						const cells = [];
						cells.length = 0;
						for (const key of Object.keys(items[i].json)) {
							cells.push({
								column: key,
								value: items[i].json[key],
							});
						}

						// Collect all the data for the different docs/tables
						if (sendData[endpoint] === undefined) {
							sendData[endpoint] = {
								rows: [],
								// TODO: This is not perfect as it ignores if qs changes between
								//       different items but should be OK for now
								qs,
							};
						}
						((sendData[endpoint]! as IDataObject).rows! as IDataObject[]).push({ cells });

						if (options.keyColumns) {
							// @ts-ignore
							(sendData[endpoint]! as IDataObject).keyColumns = options.keyColumns.split(
								',',
							) as string[];
						}
					}

					// Now that all data got collected make all the requests
					for (const endpoint of Object.keys(sendData)) {
						await codaApiRequest.call(
							this,
							'POST',
							endpoint,
							sendData[endpoint],
							(sendData[endpoint]! as IDataObject).qs! as IDataObject,
						);
					}
				} catch (error) {
					if (this.continueOnFail()) {
						return [this.helpers.returnJsonArray({ error: error.message })];
					}
					throw error;
				}
				// Return the incoming data
				return [items];
			}
			// https://coda.io/developers/apis/v1beta1#operation/getRow
			if (operation === 'getRow') {
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const tableId = this.getNodeParameter('tableId', i) as string;
						const rowId = this.getNodeParameter('rowId', i) as string;
						const options = this.getNodeParameter('options', i);

						const endpoint = `/docs/${docId}/tables/${tableId}/rows/${rowId}`;
						if (options.useColumnNames === false) {
							qs.useColumnNames = options.useColumnNames as boolean;
						} else {
							qs.useColumnNames = true;
						}
						if (options.valueFormat) {
							qs.valueFormat = options.valueFormat as string;
						}

						responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
						if (options.rawData === true) {
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData as IDataObject[]),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						} else {
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({
									id: responseData.id as string,
									...(responseData.values as IDataObject),
								}),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						}
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}

				return [returnData];
			}
			// https://coda.io/developers/apis/v1beta1#operation/listRows
			if (operation === 'getAllRows') {
				let itemsLength = items.length ? 1 : 0;

				if (nodeVersion >= 1.1) {
					itemsLength = items.length;
				}

				for (let i = 0; i < itemsLength; i++) {
					const docId = this.getNodeParameter('docId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i);
					const tableId = this.getNodeParameter('tableId', i) as string;
					const options = this.getNodeParameter('options', i);
					const endpoint = `/docs/${docId}/tables/${tableId}/rows`;
					if (options.useColumnNames === false) {
						qs.useColumnNames = options.useColumnNames as boolean;
					} else {
						qs.useColumnNames = true;
					}
					if (options.valueFormat) {
						qs.valueFormat = options.valueFormat as string;
					}
					if (options.sortBy) {
						qs.sortBy = options.sortBy as string;
					}
					if (options.visibleOnly) {
						qs.visibleOnly = options.visibleOnly as boolean;
					}
					if (options.query) {
						qs.query = options.query as string;
					}
					try {
						if (returnAll) {
							responseData = await codaApiRequestAllItems.call(
								this,
								'items',
								'GET',
								endpoint,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items;
						}

						if (options.rawData === true) {
							for (const item of responseData) {
								returnData.push({
									json: item,
									pairedItem: [{ item: i }],
								});
							}
						} else {
							for (const item of responseData) {
								returnData.push({
									json: {
										id: item.id,
										...item.values,
									},
									pairedItem: [{ item: i }],
								});
							}
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: [{ item: i }],
							});
							continue;
						}
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}

				return [returnData];
			}
			// https://coda.io/developers/apis/v1beta1#operation/deleteRows
			if (operation === 'deleteRow') {
				try {
					const sendData = {} as IDataObject;
					for (let i = 0; i < items.length; i++) {
						const docId = this.getNodeParameter('docId', i) as string;
						const tableId = this.getNodeParameter('tableId', i) as string;
						const rowId = this.getNodeParameter('rowId', i) as string;
						const endpoint = `/docs/${docId}/tables/${tableId}/rows`;

						// Collect all the data for the different docs/tables
						if (sendData[endpoint] === undefined) {
							sendData[endpoint] = [];
						}

						(sendData[endpoint] as string[]).push(rowId);
					}

					// Now that all data got collected make all the requests
					for (const endpoint of Object.keys(sendData)) {
						await codaApiRequest.call(this, 'DELETE', endpoint, { rowIds: sendData[endpoint] }, qs);
					}
				} catch (error) {
					if (this.continueOnFail()) {
						return [this.helpers.returnJsonArray({ error: error.message })];
					}
					throw error;
				}
				// Return the incoming data
				return [items];
			}
			// https://coda.io/developers/apis/v1beta1#operation/pushButton
			if (operation === 'pushButton') {
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const tableId = this.getNodeParameter('tableId', i) as string;
						const rowId = this.getNodeParameter('rowId', i) as string;
						const columnId = this.getNodeParameter('columnId', i) as string;
						const endpoint = `/docs/${docId}/tables/${tableId}/rows/${rowId}/buttons/${columnId}`;
						responseData = await codaApiRequest.call(this, 'POST', endpoint, {});
						returnData.push(responseData as INodeExecutionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [this.helpers.returnJsonArray(returnData)];
			}
			//https://coda.io/developers/apis/v1beta1#operation/getColumn
			if (operation === 'getColumn') {
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const tableId = this.getNodeParameter('tableId', i) as string;
						const columnId = this.getNodeParameter('columnId', i) as string;
						const endpoint = `/docs/${docId}/tables/${tableId}/columns/${columnId}`;
						responseData = await codaApiRequest.call(this, 'GET', endpoint, {});
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [this.helpers.returnJsonArray(returnData)];
			}
			//https://coda.io/developers/apis/v1beta1#operation/listColumns
			if (operation === 'getAllColumns') {
				for (let i = 0; i < items.length; i++) {
					try {
						const returnAll = this.getNodeParameter('returnAll', 0);
						const docId = this.getNodeParameter('docId', i) as string;
						const tableId = this.getNodeParameter('tableId', i) as string;
						const endpoint = `/docs/${docId}/tables/${tableId}/columns`;
						if (returnAll) {
							responseData = await codaApiRequestAllItems.call(this, 'items', 'GET', endpoint, {});
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items;
						}
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
		}
		if (resource === 'formula') {
			//https://coda.io/developers/apis/v1beta1#operation/getFormula
			if (operation === 'get') {
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const formulaId = this.getNodeParameter('formulaId', i) as string;
						const endpoint = `/docs/${docId}/formulas/${formulaId}`;
						responseData = await codaApiRequest.call(this, 'GET', endpoint, {});
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
			//https://coda.io/developers/apis/v1beta1#operation/listFormulas
			if (operation === 'getAll') {
				for (let i = 0; i < items.length; i++) {
					try {
						const returnAll = this.getNodeParameter('returnAll', 0);
						const docId = this.getNodeParameter('docId', i) as string;
						const endpoint = `/docs/${docId}/formulas`;
						if (returnAll) {
							responseData = await codaApiRequestAllItems.call(this, 'items', 'GET', endpoint, {});
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items;
						}
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
		}
		if (resource === 'control') {
			//https://coda.io/developers/apis/v1beta1#operation/getControl
			if (operation === 'get') {
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const controlId = this.getNodeParameter('controlId', i) as string;
						const endpoint = `/docs/${docId}/controls/${controlId}`;
						responseData = await codaApiRequest.call(this, 'GET', endpoint, {});
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
			//https://coda.io/developers/apis/v1beta1#operation/listControls
			if (operation === 'getAll') {
				const returnAll = this.getNodeParameter('returnAll', 0);
				qs.limit = this.getNodeParameter('limit', 0);
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const endpoint = `/docs/${docId}/controls`;
						if (returnAll) {
							responseData = await codaApiRequestAllItems.call(this, 'items', 'GET', endpoint, {});
						} else {
							responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items;
						}
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
		}
		if (resource === 'view') {
			//https://coda.io/developers/apis/v1beta1#operation/getView
			if (operation === 'get') {
				for (let i = 0; i < items.length; i++) {
					const docId = this.getNodeParameter('docId', i) as string;
					const viewId = this.getNodeParameter('viewId', i) as string;
					const endpoint = `/docs/${docId}/tables/${viewId}`;
					responseData = await codaApiRequest.call(this, 'GET', endpoint, {});
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
				return [returnData];
			}
			//https://coda.io/developers/apis/v1beta1#operation/listViews
			if (operation === 'getAll') {
				const returnAll = this.getNodeParameter('returnAll', 0);
				qs.limit = this.getNodeParameter('limit', 0);
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const endpoint = `/docs/${docId}/tables?tableTypes=view`;
						if (returnAll) {
							responseData = await codaApiRequestAllItems.call(this, 'items', 'GET', endpoint, {});
						} else {
							responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items;
						}
						responseData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
			if (operation === 'getAllViewRows') {
				let itemsLength = items.length ? 1 : 0;

				if (nodeVersion >= 1.1) {
					itemsLength = items.length;
				}

				for (let i = 0; i < itemsLength; i++) {
					const docId = this.getNodeParameter('docId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i);
					const viewId = this.getNodeParameter('viewId', i) as string;
					const options = this.getNodeParameter('options', i);
					const endpoint = `/docs/${docId}/tables/${viewId}/rows`;
					if (options.useColumnNames === false) {
						qs.useColumnNames = options.useColumnNames as boolean;
					} else {
						qs.useColumnNames = true;
					}
					if (options.valueFormat) {
						qs.valueFormat = options.valueFormat as string;
					}
					if (options.sortBy) {
						qs.sortBy = options.sortBy as string;
					}
					if (options.query) {
						qs.query = options.query as string;
					}
					try {
						if (returnAll) {
							responseData = await codaApiRequestAllItems.call(
								this,
								'items',
								'GET',
								endpoint,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items;
						}

						if (options.rawData === true) {
							for (const item of responseData) {
								returnData.push({
									json: item,
									pairedItem: [{ item: i }],
								});
							}
						} else {
							for (const item of responseData) {
								returnData.push({
									json: {
										id: item.id,
										...item.values,
									},
									pairedItem: [{ item: i }],
								});
							}
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: error.message },
								pairedItem: [{ item: i }],
							});
							continue;
						}
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}

				return [returnData];
			}
			//https://coda.io/developers/apis/v1beta1#operation/deleteViewRow
			if (operation === 'deleteViewRow') {
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const viewId = this.getNodeParameter('viewId', i) as string;
						const rowId = this.getNodeParameter('rowId', i) as string;
						const endpoint = `/docs/${docId}/tables/${viewId}/rows/${rowId}`;
						responseData = await codaApiRequest.call(this, 'DELETE', endpoint);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject[]),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
			//https://coda.io/developers/apis/v1beta1#operation/pushViewButton
			if (operation === 'pushViewButton') {
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const viewId = this.getNodeParameter('viewId', i) as string;
						const rowId = this.getNodeParameter('rowId', i) as string;
						const columnId = this.getNodeParameter('columnId', i) as string;
						const endpoint = `/docs/${docId}/tables/${viewId}/rows/${rowId}/buttons/${columnId}`;
						responseData = await codaApiRequest.call(this, 'POST', endpoint);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
			if (operation === 'getAllViewColumns') {
				const returnAll = this.getNodeParameter('returnAll', 0);
				qs.limit = this.getNodeParameter('limit', 0);
				for (let i = 0; i < items.length; i++) {
					try {
						const docId = this.getNodeParameter('docId', i) as string;
						const viewId = this.getNodeParameter('viewId', i) as string;
						const endpoint = `/docs/${docId}/tables/${viewId}/columns`;
						if (returnAll) {
							responseData = await codaApiRequestAllItems.call(this, 'items', 'GET', endpoint, {});
						} else {
							responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.items;
						}
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} catch (error) {
						if (this.continueOnFail()) {
							const executionErrorData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray({ error: error.messsage }),
								{ itemData: { item: i } },
							);
							returnData.push(...executionErrorData);
							continue;
						}
						throw error;
					}
				}
				return [returnData];
			}
			//https://coda.io/developers/apis/v1beta1#operation/updateViewRow
			if (operation === 'updateViewRow') {
				for (let i = 0; i < items.length; i++) {
					try {
						qs = {};
						const docId = this.getNodeParameter('docId', i) as string;
						const viewId = this.getNodeParameter('viewId', i) as string;
						const rowId = this.getNodeParameter('rowId', i) as string;
						const keyName = this.getNodeParameter('keyName', i) as string;
						const options = this.getNodeParameter('options', i);
						const body: IDataObject = {};
						const endpoint = `/docs/${docId}/tables/${viewId}/rows/${rowId}`;
						if (options.disableParsing) {
							qs.disableParsing = options.disableParsing as boolean;
						}
						const cells = [];
						cells.length = 0;

						//@ts-ignore
						for (const key of Object.keys(items[i].json[keyName])) {
							cells.push({
								column: key,
								//@ts-ignore
								value: items[i].json[keyName][key],
							});
						}
						body.row = {
							cells,
						};
						await codaApiRequest.call(this, 'PUT', endpoint, body, qs);
					} catch (error) {
						if (this.continueOnFail()) {
							items[i].json = { error: error.message };
							continue;
						}
						throw error;
					}
				}
				return [items];
			}
		}
		return [];
	}
}
