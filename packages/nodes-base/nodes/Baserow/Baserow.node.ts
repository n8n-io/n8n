import { IExecuteFunctions } from 'n8n-core';
import {
	GenericValue,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { apiRequest, apiRequestAllItems } from './GenericFunctions';

type Mapping = { [x: string]: string };

const fromEntries = (entries: Iterable<[string, GenericValue]>) => {
	const obj: IDataObject = {};
	for (const [key, value] of entries) {
		obj[key] = value;
	}
	return obj;
};

export class Baserow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Baserow',
		name: 'baserow',
		icon: 'file:baserow.svg',
		group: ['output'],
		version: 1,
		description: 'Create, update, and delete row in Baserow.',
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
				displayName: 'Host',
				name: 'host',
				type: 'string',
				default: 'https://api.baserow.io',
				placeholder: 'Baserow endpoint',
				description: 'Specify your baserow host url here.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List rows of a table.',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a row.',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new row.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a row.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a row.',
					},
				],
				default: 'list',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Table ID',
				name: 'table',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the table to access.',
			},
			// ----------------------------------
			//         get
			// ----------------------------------
			{
				displayName: 'Row ID',
				name: 'rowId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['get'],
					},
				},
				default: '',
				required: true,
				description: 'Id of the row to return.',
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'Row ID',
				name: 'rowId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: '',
				required: true,
				description: 'Id of the row to update.',
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'Row ID',
				name: 'rowId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				default: '',
				required: true,
				description: 'Id of the row to delete.',
			},

			// ----------------------------------
			//         Optionnal fields for all except list
			// ----------------------------------

			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['get', 'create', 'update', 'delete'],
					},
				},
				options: [
					{
						displayName: 'Disable field auto mapping',
						name: 'disableAutoMapping',
						type: 'boolean',
						default: true,
						description:
							'Disable field name translation from `field_xxx` to given column name.',
					},
				],
			},

			// ----------------------------------
			//         Optionnal fields for list
			// ----------------------------------

			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				options: [
					{
						displayName: 'Disable field auto mapping',
						name: 'disableAutoMapping',
						type: 'boolean',
						default: true,
						description:
							'Disable field name translation from `field_xxx` to given column name.',
					},
					{
						displayName: 'Limit result',
						name: 'limit',
						type: 'number',
						default: 0,
						description: 'Limit the result count.',
					},
					{
						displayName: 'Query size',
						name: 'size',
						type: 'number',
						default: 100,
						description: 'Size of each paginated queries.',
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description:
							'If provided, only rows with data that matches the search are returned.',
					},
					{
						displayName: 'Order',
						name: 'order',
						placeholder: 'Add order',
						description: 'Define how the result rows should be ordered.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'fields',
								displayName: 'Field',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'string',
										default: '',
										description: 'Field name to order.',
									},
									{
										displayName: 'Direction',
										name: 'direction',
										type: 'options',
										options: [
											{
												name: 'ASC',
												value: '',
												description: 'Sort in ascending order (small -> large).',
											},
											{
												name: 'DESC',
												value: '-',
												description: 'Sort in descending order (large -> small).',
											},
										],
										default: '',
										description: 'The sort direction.',
									},
								],
							},
						],
					},

					{
						displayName: 'Filter',
						name: 'filter',
						placeholder: 'Add filter',
						description: 'Define how the result rows should be filtered.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'fields',
								displayName: 'Field',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'string',
										default: '',
										description: 'Field name to order.',
									},
									{
										displayName: 'Filter',
										name: 'operator',
										type: 'options',
										options: [
											{
												name: 'Equal',
												value: 'equal',
												description: 'Field is value.',
											},
											{
												name: 'Not equal',
												value: 'not_equal',
												description: 'Field is not value.',
											},
											{
												name: 'Date equal',
												value: 'date_equal',
												description: 'Field is date \'YYY-MM-DD\'.',
											},
											{
												name: 'Date not equal',
												value: 'date_not_equal',
												description: 'Field is not date \'YYY-MM-DD\'.',
											},
											{
												name: 'Date equals today',
												value: 'date_equals_today',
												description: 'Field is today string value.',
											},
											{
												name: 'Date equals month',
												value: 'date_equals_month',
												description: 'Field in this month string value.',
											},
											{
												name: 'Date equals year',
												value: 'date_equals_year',
												description: 'Field in this year string value.',
											},
											{
												name: 'Contains',
												value: 'contains',
												description: 'Field contains value.',
											},
											{
												name: 'Filename contains',
												value: 'filename_contains',
												description: 'Field filename conains value.',
											},
											{
												name: 'Contains not',
												value: 'contains_not',
												description: 'Field not contains value.',
											},
											{
												name: 'Higher than',
												value: 'higher_than',
												description: 'Field is higher than value.',
											},
											{
												name: 'Lower than',
												value: 'lower_than',
												description: 'Field is lower than value.',
											},
											{
												name: 'Single select equal',
												value: 'single_select_equal',
												description: 'Field selected option is value.',
											},
											{
												name: 'Single select not equal',
												value: 'single_select_not_equal',
												description: 'Field selected option is not value.',
											},
											{
												name: 'Is true',
												value: 'boolean',
												description: 'Boolean field is true.',
											},
											{
												name: 'Is empty',
												value: 'empty',
												description: 'Field is empty.',
											},
											{
												name: 'Not emtpy',
												value: 'not_empty',
												description: 'Field is not empty.',
											},
										],
										default: '',
										description: 'The comparaison operator.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'The value to compare.',
									},
								],
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		let endpoint = '';
		let requestMethod = '';
		let fieldToName: Mapping;
		let nameToField: Mapping;

		let body: IDataObject = {};
		const qs: IDataObject = {};

		const operation = this.getNodeParameter('operation', 0) as string;

		const table = encodeURI(this.getNodeParameter('table', 0) as string);

		const additionalOptions = this.getNodeParameter(
			'additionalOptions',
			0,
		) as IDataObject;

		const disableAutoMapping = additionalOptions.disableAutoMapping === true;

		if (!disableAutoMapping) {
			// Compute map for automapping
			endpoint = `/api/database/fields/table/${table}/`;
			responseData = await apiRequest.call(this, 'GET', endpoint, {}, {});
			nameToField = fromEntries(
				responseData.map((field: { name: string; id: number }) => [
					field.name,
					`field_${field.id}`,
				]),
			) as Mapping;
			fieldToName = fromEntries(
				responseData.map((field: { name: string; id: number }) => [
					`field_${field.id}`,
					field.name,
				]),
			) as Mapping;
		}

		if (operation === 'list') {
			requestMethod = 'GET';
			endpoint = `/api/database/rows/table/${table}/`;

			const additionalOptions = this.getNodeParameter(
				'additionalOptions',
				0,
				{},
			) as IDataObject;

			let limit = 0;

			// Parse additionnal list options
			for (const key of Object.keys(additionalOptions)) {
				switch (key) {
					case 'order':
						// Add order
						const order = additionalOptions.order as IDataObject;
						if (order && order.fields) {
							qs['order_by'] = (order.fields as Array<{
								field: string;
								direction: string;
							}>)
								.map(
									({ field, direction }) =>
										`${direction}${
											disableAutoMapping ? field : nameToField[field] || field
										}`,
								)
								.join(',');
						}
						break;
					case 'filter':
						// Add filter
						const filter = additionalOptions.filter as IDataObject;
						if (filter && filter.fields) {
							(filter.fields as Array<{
								field: string;
								operator: string;
								value: string;
							}>).forEach(({ field, operator, value }) => {
								qs[
									`filter__${
										disableAutoMapping ? field : nameToField[field] || field
									}__${operator}`
								] = value;
							});
						}
						break;
					case 'limit':
						// Define limit
						limit = additionalOptions.limit as number;
						break;
					default:
						qs[key] = additionalOptions[key];
				}
			}

			// Process all items
			for (let i = 0; i < items.length; i++) {
				responseData = await apiRequestAllItems.call(
					this,
					requestMethod,
					endpoint,
					body,
					qs,
					limit,
				);

				if (!disableAutoMapping) {
					responseData = responseData.map((row: IDataObject) =>
						fromEntries(
							Object.entries(row).map(([key, value]) => [
								fieldToName[key] || key,
								value as GenericValue,
							]),
						),
					);
				}

				returnData.push.apply(returnData, responseData);
			}
		}

		// Get operation
		if (operation === 'get') {
			requestMethod = 'GET';
			let rowId: string;
			for (let i = 0; i < items.length; i++) {
				rowId = encodeURI(this.getNodeParameter('rowId', i) as string);
				endpoint = `/api/database/rows/table/${table}/${rowId}/`;
				responseData = await apiRequest.call(
					this,
					requestMethod,
					endpoint,
					body,
					qs,
				);
				if (!disableAutoMapping) {
					responseData = fromEntries(
						Object.entries(responseData).map(([key, value]) => [
							fieldToName[key] || key,
							value as GenericValue,
						]),
					);
				}
				returnData.push(responseData);
			}
		}

		// Create operation
		if (operation === 'create') {
			requestMethod = 'POST';
			endpoint = `/api/database/rows/table/${table}/`;
			for (let i = 0; i < items.length; i++) {
				body = { ...items[i].json };

				if (!disableAutoMapping) {
					body = fromEntries(
						Object.entries(body).map(([key, value]) => [
							nameToField[key] || key,
							value as GenericValue,
						]),
					);
				}

				responseData = await apiRequest.call(
					this,
					requestMethod,
					endpoint,
					body,
					qs,
				);

				if (!disableAutoMapping) {
					responseData = fromEntries(
						Object.entries(responseData).map(([key, value]) => [
							fieldToName[key] || key,
							value as GenericValue,
						]),
					);
				}

				returnData.push(responseData);
			}
		}

		// Update operation
		if (operation === 'update') {
			requestMethod = 'PATCH';
			let rowId: string;
			for (let i = 0; i < items.length; i++) {
				rowId = encodeURI(this.getNodeParameter('rowId', i) as string);
				endpoint = `/api/database/rows/table/${table}/${rowId}/`;
				body = { ...items[i].json };

				if (!disableAutoMapping) {
					body = fromEntries(
						Object.entries(body).map(([key, value]) => [
							nameToField[key] || key,
							value as GenericValue,
						]),
					);
				}

				responseData = await apiRequest.call(
					this,
					requestMethod,
					endpoint,
					body,
					qs,
				);

				if (!disableAutoMapping) {
					responseData = fromEntries(
						Object.entries(responseData).map(([key, value]) => [
							fieldToName[key] || key,
							value as GenericValue,
						]),
					);
				}

				returnData.push(responseData);
			}
		}

		// Delete operation
		if (operation === 'delete') {
			requestMethod = 'DELETE';
			let rowId: string;
			for (let i = 0; i < items.length; i++) {
				rowId = encodeURI(this.getNodeParameter('rowId', i) as string);
				endpoint = `/api/database/rows/table/${table}/${rowId}/`;
				responseData = await apiRequest.call(
					this,
					requestMethod,
					endpoint,
					body,
					qs,
				);
				returnData.push({success: true});
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
