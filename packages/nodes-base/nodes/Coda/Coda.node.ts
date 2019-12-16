import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	codaApiRequest,
	codaApiRequestAllItems,
} from './GenericFunctions';
import {
	tableFields,
	tableOperations,
} from './TableDescription';

export class Coda implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Coda',
		name: 'Coda',
		icon: 'file:coda.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Coda Beta API',
		defaults: {
			name: 'Coda',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'codaApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Table',
						value: 'table',
						description: `Access data of tables in documents.`,
					},
				],
				default: 'table',
				description: 'Resource to consume.',
			},
			...tableOperations,
			...tableFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available docs to display them to user so that he can
			// select them easily
			async getDocs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {};
				let docs;
				try {
					docs = await codaApiRequestAllItems.call(this,'items', 'GET', `/docs`, {}, qs);
				} catch (err) {
					throw new Error(`Coda Error: ${err}`);
				}
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
			// Get all the available tables to display them to user so that he can
			// select them easily
			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let tables;

				const docId = this.getCurrentNodeParameter('docId');

				try {
					tables = await codaApiRequestAllItems.call(this, 'items', 'GET', `/docs/${docId}/tables`, {});
				} catch (err) {
					throw new Error(`Coda Error: ${err}`);
				}
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
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];
		const items = this.getInputData();
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let qs: IDataObject = {};

		if (resource === 'table') {
			// https://coda.io/developers/apis/v1beta1#operation/upsertRows
			if (operation === 'createRow') {
				const sendData = {} as IDataObject;
				for (let i = 0; i < items.length; i++) {
					qs = {};
					const docId = this.getNodeParameter('docId', i) as string;
					const tableId = this.getNodeParameter('tableId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const endpoint = `/docs/${docId}/tables/${tableId}/rows`;

					if (additionalFields.keyColumns) {
						// @ts-ignore
						items[i].json['keyColumns'] = additionalFields.keyColumns.split(',') as string[];
					}
					if (additionalFields.disableParsing) {
						qs.disableParsing = additionalFields.disableParsing as boolean;
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
				}

				// Now that all data got collected make all the requests
				for (const endpoint of Object.keys(sendData)) {
					await codaApiRequest.call(this, 'POST', endpoint, sendData[endpoint], (sendData[endpoint]! as IDataObject).qs! as IDataObject);
				}

				// Return the incoming data
				return [items];
			}
			// https://coda.io/developers/apis/v1beta1#operation/getRow
			if (operation === 'getRow') {
				for (let i = 0; i < items.length; i++) {
					const docId = this.getNodeParameter('docId', i) as string;
					const tableId = this.getNodeParameter('tableId', i) as string;
					const rowId = this.getNodeParameter('rowId', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;

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
						returnData.push(responseData);
					} else {
						returnData.push({
							id: responseData.id,
							...responseData.values
						});
					}
				}

				return [this.helpers.returnJsonArray(returnData)];
			}
			// https://coda.io/developers/apis/v1beta1#operation/listRows
			if (operation === 'getAllRows') {
				const docId = this.getNodeParameter('docId', 0) as string;
				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const options = this.getNodeParameter('options', 0) as IDataObject;
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
				try {
					if (returnAll === true) {
						responseData = await codaApiRequestAllItems.call(this, 'items', 'GET', endpoint, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', 0) as number;
						responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
						responseData = responseData.items;
					}
				} catch (err) {
					throw new Error(`Flow Error: ${err.message}`);
				}

				if (options.rawData === true) {
					return [this.helpers.returnJsonArray(responseData)];
				} else {
					for (const item of responseData) {
						returnData.push({
							id: item.id,
							...item.values
						});
					}
					return [this.helpers.returnJsonArray(returnData)];
				}
			}
			// https://coda.io/developers/apis/v1beta1#operation/deleteRows
			if (operation === 'deleteRow') {
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
					await codaApiRequest.call(this, 'DELETE', endpoint, { rowIds: sendData[endpoint]}, qs);
				}

				// Return the incoming data
				return [items];
			}
		}

		return [];
	}
}
