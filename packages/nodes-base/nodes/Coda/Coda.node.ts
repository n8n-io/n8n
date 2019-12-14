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
	rowOpeations,
	rowFields
} from './RowDescription';

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
						name: 'Rows',
						value: 'row',
						description: `You'll likely use this part of the API the most.
						These endpoints let you retrieve row data from tables in Coda as well
						as create, upsert, update, and delete them.`,
					},
				],
				default: 'row',
				description: 'Resource to consume.',
			},
			...rowOpeations,
			...rowFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available tables to display them to user so that he can
			// select them easily
			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const credentials = this.getCredentials('codaApi');
				const qs = {};
				let tables;
				try {
					tables = await codaApiRequestAllItems.call(this,'items', 'GET', `/docs/${credentials!.docId}/tables`, {}, qs);
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
		const credentials = this.getCredentials('codaApi');
		const docId = credentials!.docId;
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		if (resource === 'row') {
			//https://coda.io/developers/apis/v1beta1#operation/upsertRows
			if (operation === 'create') {
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const endpoint = `/docs/${docId}/tables/${tableId}/rows`;
				if (additionalFields.keyColumns) {
					// @ts-ignore
					items[0].json['keyColumns'] = additionalFields.keyColumns.split(',') as string[];
				}
				if (additionalFields.disableParsing) {
					qs.disableParsing = additionalFields.disableParsing as boolean;
				}
				try {
					responseData = await codaApiRequest.call(this, 'POST', endpoint, items[0].json, qs);
				} catch (err) {
					throw new Error(`Coda Error: ${err.message}`);
				}
			}
			//https://coda.io/developers/apis/v1beta1#operation/getRow
			if (operation === 'get') {
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const rowId = this.getNodeParameter('rowId', 0) as string;
				const filters = this.getNodeParameter('filters', 0) as IDataObject;
				const endpoint = `/docs/${docId}/tables/${tableId}/rows/${rowId}`;
				if (filters.useColumnNames) {
					qs.useColumnNames = filters.useColumnNames as boolean;
				}
				if (filters.valueFormat) {
					qs.valueFormat = filters.valueFormat as string;
				}
				try {
					responseData = await codaApiRequest.call(this, 'GET', endpoint, {}, qs);
				} catch (err) {
					throw new Error(`Coda Error: ${err.message}`);
				}
			}
			//https://coda.io/developers/apis/v1beta1#operation/listRows
			if (operation === 'getAll') {
				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const filters = this.getNodeParameter('filters', 0) as IDataObject;
				const endpoint = `/docs/${docId}/tables/${tableId}/rows`;
				if (filters.useColumnNames) {
					qs.useColumnNames = filters.useColumnNames as boolean;
				}
				if (filters.valueFormat) {
					qs.valueFormat = filters.valueFormat as string;
				}
				if (filters.sortBy) {
					qs.sortBy = filters.sortBy as string;
				}
				if (filters.visibleOnly) {
					qs.visibleOnly = filters.visibleOnly as boolean;
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
			}
			//https://coda.io/developers/apis/v1beta1#operation/deleteRows
			if (operation === 'delete') {
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const rowId = this.getNodeParameter('rowId', 0) as string;
				const body = {};
				const endpoint = `/docs/${docId}/tables/${tableId}/rows`;
				try {
					// @ts-ignore
					body['rowIds'] = rowId.split(',') as string[];
					responseData = await codaApiRequest.call(this, 'DELETE', endpoint, body, qs);
				} catch (err) {
					throw new Error(`Coda Error: ${err.message}`);
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(responseData)];
	}
}
