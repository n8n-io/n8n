import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from './GenericFunctions';

export class Airtable implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Airtable',
		name: 'airtable',
		icon: 'file:airtable.svg',
		group: ['input'],
		version: 1,
		description: 'Read, update, write and delete data from Airtable',
		defaults: {
			name: 'Airtable',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'airtableApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Append the data to a table',
						action: 'Append data to a table',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete data from a table',
						action: 'Delete data from a table',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List data from a table',
						action: 'List data from a table',
					},
					{
						name: 'Read',
						value: 'read',
						description: 'Read data from a table',
						action: 'Read data from a table',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update data in a table',
						action: 'Update data in a table',
					},
				],
				default: 'read',
			},

			// ----------------------------------
			//         All
			// ----------------------------------

			{
				displayName: 'Base',
				name: 'application',
				type: 'resourceLocator',
				default: { mode: 'url', value: '' },
				required: true,
				description: 'The Airtable Base in which to operate on',
				modes: [
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://airtable.com/app12DiScdfes/tblAAAAAAAAAAAAA/viwHdfasdfeieg5p',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'https://airtable.com/([a-zA-Z0-9]{2,})/.*',
									errorMessage: 'Not a valid Airtable Base URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: 'https://airtable.com/([a-zA-Z0-9]{2,})',
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[a-zA-Z0-9]{2,}',
									errorMessage: 'Not a valid Airtable Base ID',
								},
							},
						],
						placeholder: 'appD3dfaeidke',
						url: '=https://airtable.com/{{$value}}',
					},
				],
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'resourceLocator',
				default: { mode: 'url', value: '' },
				required: true,
				modes: [
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://airtable.com/app12DiScdfes/tblAAAAAAAAAAAAA/viwHdfasdfeieg5p',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'https://airtable.com/[a-zA-Z0-9]{2,}/([a-zA-Z0-9]{2,})/.*',
									errorMessage: 'Not a valid Airtable Table URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: 'https://airtable.com/[a-zA-Z0-9]{2,}/([a-zA-Z0-9]{2,})',
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[a-zA-Z0-9]{2,}',
									errorMessage: 'Not a valid Airtable Table ID',
								},
							},
						],
						placeholder: 'tbl3dirwqeidke',
					},
				],
			},

			// ----------------------------------
			//         append
			// ----------------------------------
			{
				displayName: 'Add All Fields',
				name: 'addAllFields',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['append'],
					},
				},
				default: true,
				description: 'Whether all fields should be sent to Airtable or only specific ones',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Field',
				},
				displayOptions: {
					show: {
						addAllFields: [false],
						operation: ['append'],
					},
				},
				default: [],
				placeholder: 'Name',
				required: true,
				description: 'The name of fields for which data should be sent to Airtable',
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to delete',
			},

			// ----------------------------------
			//         list
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				default: true,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['list'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				default: false,
				description: "Whether the attachment fields define in 'Download Fields' will be downloaded",
			},
			{
				displayName: 'Download Fields',
				name: 'downloadFieldNames',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['list'],
						downloadAttachments: [true],
					},
				},
				default: '',
				description:
					"Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.",
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				default: {},
				description: 'Additional options which decide which records should be returned',
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Field',
						},
						default: [],
						placeholder: 'Name',
						description:
							'Only data for fields whose names are in this list will be included in the records',
					},
					{
						displayName: 'Filter By Formula',
						name: 'filterByFormula',
						type: 'string',
						default: '',
						placeholder: "NOT({Name} = '')",
						description:
							'A formula used to filter records. The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response.',
					},
					{
						displayName: 'Sort',
						name: 'sort',
						placeholder: 'Add Sort Rule',
						description: 'Defines how the returned records should be ordered',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'string',
										default: '',
										description: 'Name of the field to sort on',
									},
									{
										displayName: 'Direction',
										name: 'direction',
										type: 'options',
										options: [
											{
												name: 'ASC',
												value: 'asc',
												description: 'Sort in ascending order (small -> large)',
											},
											{
												name: 'DESC',
												value: 'desc',
												description: 'Sort in descending order (large -> small)',
											},
										],
										default: 'asc',
										description: 'The sort direction',
									},
								],
							},
						],
					},
					{
						displayName: 'View',
						name: 'view',
						type: 'string',
						default: '',
						placeholder: 'All Stories',
						description:
							'The name or ID of a view in the Stories table. If set, only the records in that view will be returned. The records will be sorted according to the order of the view.',
					},
				],
			},

			// ----------------------------------
			//         read
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['read'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to return',
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the record to update',
			},
			{
				displayName: 'Update All Fields',
				name: 'updateAllFields',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['update'],
					},
				},
				default: true,
				description: 'Whether all fields should be sent to Airtable or only specific ones',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Field',
				},
				displayOptions: {
					show: {
						updateAllFields: [false],
						operation: ['update'],
					},
				},
				default: [],
				placeholder: 'Name',
				required: true,
				description: 'The name of fields for which data should be sent to Airtable',
			},

			// ----------------------------------
			//         append + delete + update
			// ----------------------------------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: ['append', 'delete', 'update'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Bulk Size',
						name: 'bulkSize',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 10,
						},
						default: 10,
						description: 'Number of records to process at once',
					},
					{
						displayName: 'Ignore Fields',
						name: 'ignoreFields',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['update'],
								'/updateAllFields': [true],
							},
						},
						default: '',
						description: 'Comma-separated list of fields to ignore',
					},
					{
						displayName: 'Typecast',
						name: 'typecast',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': ['append', 'update'],
							},
						},
						default: false,
						description:
							'Whether the Airtable API should attempt mapping of string values for linked records & select options',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData;

		const operation = this.getNodeParameter('operation', 0) as string;

		const application = this.getNodeParameter('application', 0, undefined, {
			extractValue: true,
		}) as string;

		const table = encodeURI(
			this.getNodeParameter('table', 0, undefined, {
				extractValue: true,
			}) as string,
		);

		let returnAll = false;
		let endpoint = '';
		let requestMethod = '';

		const body: IDataObject = {};
		const qs: IDataObject = {};

		if (operation === 'append') {
			// ----------------------------------
			//         append
			// ----------------------------------

			requestMethod = 'POST';
			endpoint = `${application}/${table}`;

			let addAllFields: boolean;
			let fields: string[];
			let options: IDataObject;

			const rows: IDataObject[] = [];
			let bulkSize = 10;

			for (let i = 0; i < items.length; i++) {
				try {
					addAllFields = this.getNodeParameter('addAllFields', i) as boolean;
					options = this.getNodeParameter('options', i, {}) as IDataObject;
					bulkSize = (options.bulkSize as number) || bulkSize;

					const row: IDataObject = {};

					if (addAllFields === true) {
						// Add all the fields the item has
						row.fields = { ...items[i].json };
						// tslint:disable-next-line: no-any
						delete (row.fields! as any).id;
					} else {
						// Add only the specified fields
						row.fields = {} as IDataObject;

						fields = this.getNodeParameter('fields', i, []) as string[];

						for (const fieldName of fields) {
							// @ts-ignore
							row.fields[fieldName] = items[i].json[fieldName];
						}
					}

					rows.push(row);

					if (rows.length === bulkSize || i === items.length - 1) {
						if (options.typecast === true) {
							body['typecast'] = true;
						}

						body['records'] = rows;

						responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData.records),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
						// empty rows
						rows.length = 0;
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
						continue;
					}
					throw error;
				}
			}
		} else if (operation === 'delete') {
			requestMethod = 'DELETE';

			const rows: string[] = [];
			const options = this.getNodeParameter('options', 0, {}) as IDataObject;
			const bulkSize = (options.bulkSize as number) || 10;

			for (let i = 0; i < items.length; i++) {
				try {
					let id: string;

					id = this.getNodeParameter('id', i) as string;

					rows.push(id);

					if (rows.length === bulkSize || i === items.length - 1) {
						endpoint = `${application}/${table}`;

						// Make one request after another. This is slower but makes
						// sure that we do not run into the rate limit they have in
						// place and so block for 30 seconds. Later some global
						// functionality in core should make it easy to make requests
						// according to specific rules like not more than 5 requests
						// per seconds.
						qs.records = rows;

						responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData.records),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
						// empty rows
						rows.length = 0;
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
						continue;
					}
					throw error;
				}
			}
		} else if (operation === 'list') {
			// ----------------------------------
			//         list
			// ----------------------------------
			try {
				requestMethod = 'GET';
				endpoint = `${application}/${table}`;

				returnAll = this.getNodeParameter('returnAll', 0) as boolean;

				const downloadAttachments = this.getNodeParameter('downloadAttachments', 0) as boolean;

				const additionalOptions = this.getNodeParameter('additionalOptions', 0, {}) as IDataObject;

				for (const key of Object.keys(additionalOptions)) {
					if (key === 'sort' && (additionalOptions.sort as IDataObject).property !== undefined) {
						qs[key] = (additionalOptions[key] as IDataObject).property;
					} else {
						qs[key] = additionalOptions[key];
					}
				}

				if (returnAll === true) {
					responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
				} else {
					qs.maxRecords = this.getNodeParameter('limit', 0) as number;
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
				}

				returnData.push.apply(returnData, responseData.records);

				if (downloadAttachments === true) {
					const downloadFieldNames = (
						this.getNodeParameter('downloadFieldNames', 0) as string
					).split(',');
					const data = await downloadRecordAttachments.call(
						this,
						responseData.records,
						downloadFieldNames,
					);
					return [data];
				}

				// We can return from here
				return [
					this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(returnData), {
						itemData: { item: 0 },
					}),
				];
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
				} else {
					throw error;
				}
			}
		} else if (operation === 'read') {
			// ----------------------------------
			//         read
			// ----------------------------------

			requestMethod = 'GET';

			let id: string;
			for (let i = 0; i < items.length; i++) {
				id = this.getNodeParameter('id', i) as string;

				endpoint = `${application}/${table}/${id}`;

				// Make one request after another. This is slower but makes
				// sure that we do not run into the rate limit they have in
				// place and so block for 30 seconds. Later some global
				// functionality in core should make it easy to make requests
				// according to specific rules like not more than 5 requests
				// per seconds.
				try {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
						continue;
					}
					throw error;
				}
			}
		} else if (operation === 'update') {
			// ----------------------------------
			//         update
			// ----------------------------------

			requestMethod = 'PATCH';

			let updateAllFields: boolean;
			let fields: string[];
			let options: IDataObject;

			const rows: IDataObject[] = [];
			let bulkSize = 10;

			for (let i = 0; i < items.length; i++) {
				try {
					updateAllFields = this.getNodeParameter('updateAllFields', i) as boolean;
					options = this.getNodeParameter('options', i, {}) as IDataObject;
					bulkSize = (options.bulkSize as number) || bulkSize;

					const row: IDataObject = {};
					row.fields = {} as IDataObject;

					if (updateAllFields === true) {
						// Update all the fields the item has
						row.fields = { ...items[i].json };
						// remove id field
						// tslint:disable-next-line: no-any
						delete (row.fields! as any).id;

						if (options.ignoreFields && options.ignoreFields !== '') {
							const ignoreFields = (options.ignoreFields as string)
								.split(',')
								.map((field) => field.trim())
								.filter((field) => !!field);
							if (ignoreFields.length) {
								// From: https://stackoverflow.com/questions/17781472/how-to-get-a-subset-of-a-javascript-objects-properties
								row.fields = Object.entries(items[i].json)
									.filter(([key]) => !ignoreFields.includes(key))
									.reduce((obj, [key, val]) => Object.assign(obj, { [key]: val }), {});
							}
						}
					} else {
						fields = this.getNodeParameter('fields', i, []) as string[];

						for (const fieldName of fields) {
							// @ts-ignore
							row.fields[fieldName] = items[i].json[fieldName];
						}
					}

					row.id = this.getNodeParameter('id', i) as string;

					rows.push(row);

					if (rows.length === bulkSize || i === items.length - 1) {
						endpoint = `${application}/${table}`;

						// Make one request after another. This is slower but makes
						// sure that we do not run into the rate limit they have in
						// place and so block for 30 seconds. Later some global
						// functionality in core should make it easy to make requests
						// according to specific rules like not more than 5 requests
						// per seconds.

						const data = { records: rows, typecast: options.typecast ? true : false };

						responseData = await apiRequest.call(this, requestMethod, endpoint, data, qs);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData.records),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);

						// empty rows
						rows.length = 0;
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
						continue;
					}
					throw error;
				}
			}
		} else {
			throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
		}

		return this.prepareOutputData(returnData);
	}
}
