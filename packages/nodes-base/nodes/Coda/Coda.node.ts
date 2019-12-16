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
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];
		const items = this.getInputData();
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		if (resource === 'row') {
			//https://coda.io/developers/apis/v1beta1#operation/upsertRows
			if (operation === 'create') {
				const docId = this.getNodeParameter('docId', 0) as string;
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
				const docId = this.getNodeParameter('docId', 0) as string;
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
				const docId = this.getNodeParameter('docId', 0) as string;
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
				const docId = this.getNodeParameter('docId', 0) as string;
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const body = {};
				let rowIds = '';
				const endpoint = `/docs/${docId}/tables/${tableId}/rows`;
				for (let i = 0; i < items.length; i++) {
					const rowId = this.getNodeParameter('rowId', i) as string;
					rowIds += rowId;
				}
				// @ts-ignore
				body['rowIds'] = rowIds.split(',') as string[];
				try {
					// @ts-ignore
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
