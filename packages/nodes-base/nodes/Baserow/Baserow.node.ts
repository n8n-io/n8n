import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	baserowApiRequest,
	baserowApiRequestAllItems,
	extractTableIdFromUrl,
	getFieldNamesAndIds,
	getJwtToken,
	TableFieldMapper,
} from './GenericFunctions';

import {
	operationFields
} from './OperationDescription';

import {
	BaserowCredentials,
	GetAllAdditionalOptions,
	Row,
	TableField,
} from './types';

export class Baserow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Baserow',
		name: 'baserow',
		icon: 'file:baserow.svg',
		group: ['output'],
		version: 1,
		description: 'Consume the Baserow API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Baserow',
			color: '#00a2ce',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'baserowApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a row',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a row',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a row',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Retrieve all rows',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a row',
					},
				],
				default: 'getAll',
				description: 'Operation to perform',
			},
			...operationFields,
		],
	};

	methods = {
		loadOptions: {
			async getTableFields(this: ILoadOptionsFunctions) {
				const tableIdOrUrl = this.getNodeParameter('tableId', 0) as string;
				const tableId = extractTableIdFromUrl(tableIdOrUrl);

				const credentials = this.getCredentials('baserowApi') as BaserowCredentials;
				const jwtToken = await getJwtToken.call(this, credentials);

				const endpoint = `/api/database/fields/table/${tableId}/`;
				const fields = await baserowApiRequest.call(this, 'GET', endpoint, {}, {}, jwtToken) as TableField[];

				return fields.map(({ name, id }) => ({ name, value: id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mapper = new TableFieldMapper();
		const returnData: IDataObject[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		const tableIdOrUrl = this.getNodeParameter('tableId', 0) as string;
		const tableId = extractTableIdFromUrl(tableIdOrUrl);

		const { disableAutoMapping } = this.getNodeParameter('additionalOptions', 0) as { disableAutoMapping: boolean };

		const credentials = this.getCredentials('baserowApi') as BaserowCredentials;
		const jwtToken = await getJwtToken.call(this, credentials);

		const mapIds = !disableAutoMapping;

		if (mapIds) {
			mapper.mapIds = mapIds;
			const fields = await mapper.getTableFields.call(this, tableId, jwtToken);
			mapper.createMappings(fields);
		}

		for (let i = 0; i < items.length; i++) {

			try {

				if (operation === 'getAll') {

					// ----------------------------------
					//             getAll
					// ----------------------------------

					// https://api.baserow.io/api/redoc/#operation/list_database_table_rows

					const { order, filters } = this.getNodeParameter('additionalOptions', 0) as GetAllAdditionalOptions;

					const qs: IDataObject = {};

					if (order?.fields) {
						qs['order_by'] = order.fields
							.map(({ field, direction }) => `${direction}${mapper.setField(field)}`)
							.join(',');
					}

					if (filters?.fields) {
						filters.fields.forEach(({ field, operator, value }) => {
							qs[`filter__field_${mapper.setField(field)}__${operator}`] = value;
						});
					}

					const endpoint = `/api/database/rows/table/${tableId}/`;
					const rows = await baserowApiRequestAllItems.call(this, 'GET', endpoint, {}, qs, jwtToken) as Row[];

					if (mapIds) {
						rows.forEach(row => mapper.idsToNames(row));
					}

					returnData.push(...rows);

				} else if (operation === 'get') {

					// ----------------------------------
					//             get
					// ----------------------------------

					// https://api.baserow.io/api/redoc/#operation/get_database_table_row

					const rowId = this.getNodeParameter('rowId', i) as string;
					const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
					const row = await baserowApiRequest.call(this, 'GET', endpoint, {}, {}, jwtToken);

					if (mapIds) mapper.idsToNames(row);

					returnData.push(row);

				} else if (operation === 'create') {

					// ----------------------------------
					//             create
					// ----------------------------------

					// https://api.baserow.io/api/redoc/#operation/create_database_table_row

					const body: IDataObject = {};

					const rawColumns = this.getNodeParameter('columns', i) as string;
					const columns = rawColumns.split(',').map(c => c.trim());
					const incomingKeys = Object.keys(items[i].json);
					const dbFields = await getFieldNamesAndIds.call(this, tableId, jwtToken);

					for (const key of incomingKeys) {
						if (!columns.includes(key)) continue;

						if (mapIds && dbFields.names.includes(key)) {
							body[key] = items[i].json[key];
						}

						if (!mapIds && dbFields.ids.includes(key)) {
							body[key] = items[i].json[key];
						}
					}

					if (mapIds) mapper.namesToIds(body);

					const endpoint = `/api/database/rows/table/${tableId}/`;
					const createdRow = await baserowApiRequest.call(this, 'POST', endpoint, body, {}, jwtToken);

					if (mapIds) mapper.idsToNames(createdRow);

					returnData.push(createdRow);

				} else if (operation === 'update') {

					// ----------------------------------
					//             update
					// ----------------------------------

					// https://api.baserow.io/api/redoc/#operation/update_database_table_row

					const rowId = this.getNodeParameter('rowId', i) as string;

					const body: IDataObject = {};

					const rawColumns = this.getNodeParameter('columns', i) as string;
					const columns = rawColumns.split(',').map(c => c.trim());
					const incomingKeys = Object.keys(items[i].json);
					const dbFields = await getFieldNamesAndIds.call(this, tableId, jwtToken);

					for (const key of incomingKeys) {
						if (!columns.includes(key)) continue;

						if (mapIds && dbFields.names.includes(key)) {
							body[key] = items[i].json[key];
						}

						if (!mapIds && dbFields.ids.includes(key)) {
							body[key] = items[i].json[key];
						}
					}

					if (mapIds) mapper.namesToIds(body);

					const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
					const updatedRow = await baserowApiRequest.call(this, 'PATCH', endpoint, body, {}, jwtToken);

					if (mapIds) mapper.idsToNames(updatedRow);

					returnData.push(updatedRow);

				} else if (operation === 'delete') {

					// ----------------------------------
					//             delete
					// ----------------------------------

					// https://api.baserow.io/api/redoc/#operation/delete_database_table_row

					const rowId = this.getNodeParameter('rowId', i) as string;

					const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
					await baserowApiRequest.call(this, 'DELETE', endpoint, {}, {}, jwtToken);

					returnData.push({ success: true });

				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
