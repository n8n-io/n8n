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
	TableFieldMapper,
} from './GenericFunctions';

import {
	operationFields
} from './OperationDescription';

import {
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
		description: 'Consume the Baserow API.',
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
					},
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Get',
						value: 'get',
					},
					{
						name: 'Get All',
						value: 'getAll',
					},
					{
						name: 'Update',
						value: 'update',
					},
				],
				default: 'getAll',
				description: 'Operation to perform.',
			},
			...operationFields,
		],
	};

	methods = {
		loadOptions: {
			async getTableFields(this: ILoadOptionsFunctions) {
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const endpoint = `/api/database/fields/table/${tableId}/`;

				const fields = await baserowApiRequest.call(this, 'GET', endpoint) as TableField[];

				return fields.map(({ name, id }) => ({ name, value: id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mapper = new TableFieldMapper();
		const returnData: IDataObject[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		const tableId = this.getNodeParameter('tableId', 0) as string;

		const mapIds = !this.getNodeParameter('additionalOptions.disableAutoMapping', 0) as boolean;

		if (mapIds) {
			mapper.mapIds = mapIds;
			const fields = await mapper.getTableFields.call(this, tableId);
			mapper.createMappings(fields);
		}

		if (operation === 'getAll') {

			// ----------------------------------
			//             getAll
			// ----------------------------------

			// https://api.baserow.io/api/redoc/#operation/list_database_table_rows

			for (let i = 0; i < items.length; i++) {

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
				const rows = await baserowApiRequestAllItems.call(this, 'GET', endpoint, {}, qs) as Row[];

				if (mapIds) {
					rows.forEach(row => mapper.idsToNames(row));
				}

				returnData.push(...rows);
			}

		} else if (operation === 'get') {

			// ----------------------------------
			//             get
			// ----------------------------------

			// https://api.baserow.io/api/redoc/#operation/get_database_table_row

			for (let i = 0; i < items.length; i++) {
				const rowId = this.getNodeParameter('rowId', i) as string;
				const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
				const row = await baserowApiRequest.call(this, 'GET', endpoint);

				if (mapIds) mapper.idsToNames(row);

				returnData.push(row);
			}

		} else if (operation === 'create') {

			// ----------------------------------
			//             create
			// ----------------------------------

			// https://api.baserow.io/api/redoc/#operation/create_database_table_row

			for (let i = 0; i < items.length; i++) {
				const body = { ...items[i].json };

				if (mapIds) mapper.namesToIds(body);

				const endpoint = `/api/database/rows/table/${tableId}/`;
				const createdRow = await baserowApiRequest.call(this, 'POST', endpoint, body);

				if (mapIds) mapper.idsToNames(createdRow);

				returnData.push(createdRow);
			}

		} else if (operation === 'update') {

			// ----------------------------------
			//             update
			// ----------------------------------

			// https://api.baserow.io/api/redoc/#operation/update_database_table_row

			for (let i = 0; i < items.length; i++) {
				const rowId = this.getNodeParameter('rowId', i) as string;

				const body = { ...items[i].json };

				if (mapIds) mapper.namesToIds(body);

				const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
				const updatedRow = await baserowApiRequest.call(this, 'PATCH', endpoint, body);

				if (mapIds) mapper.idsToNames(updatedRow);

				returnData.push(updatedRow);
			}

		} else if (operation === 'delete') {

			// ----------------------------------
			//             delete
			// ----------------------------------

			// https://api.baserow.io/api/redoc/#operation/delete_database_table_row

			for (let i = 0; i < items.length; i++) {
				const rowId = this.getNodeParameter('rowId', i) as string;

				const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
				await baserowApiRequest.call(this, 'DELETE', endpoint);

				returnData.push({ success: true });
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
