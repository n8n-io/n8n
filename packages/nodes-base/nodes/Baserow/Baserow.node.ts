import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	baserowApiRequest,
	baserowFileUploadRequest,
	baserowApiRequestAllItems,
	getJwtToken,
	TableFieldMapper,
	toOptions,
	getTableFields,
} from './GenericFunctions';
import { operationFields } from './OperationDescription';
import type {
	BaserowCredentials,
	FieldsUiValues,
	FileOperation,
	GetAllAdditionalOptions,
	LoadedResource,
	Resource,
	RowOperation,
	Row,
} from './types';

export class Baserow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Baserow',
		name: 'baserow',
		icon: 'file:baserow.svg',
		group: ['output'],
		version: 1,
		description: 'Consume the Baserow API',
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		defaults: {
			name: 'Baserow',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'baserowApi',
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
						name: 'Row',
						value: 'row',
					},
				],
				default: 'row',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['row'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a row',
						action: 'Create a row',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a row',
						action: 'Delete a row',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a row',
						action: 'Get a row',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Retrieve many rows',
						action: 'Get many rows',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a row',
						action: 'Update a row',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file',
						action: 'Upload a file',
					},
					{
						name: 'Upload via URL',
						value: 'upload-via-url',
						description: 'Upload a file via URL',
						action: 'Upload a file via URL',
					},
				],
				default: 'upload',
			},
			{
				displayName: 'Input Data Field Name',
				name: 'binaryPropertyName',

				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				required: true,
				description:
					'The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG.',
			},
			...operationFields,
		],
	};

	methods = {
		loadOptions: {
			async getDatabaseIds(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
				const jwtToken = await getJwtToken.call(this, credentials);
				const endpoint = '/api/applications/';
				const databases = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					jwtToken,
				)) as LoadedResource[];
				// Baserow has different types of applications, we only want the databases
				// https://api.baserow.io/api/redoc/#tag/Applications/operation/list_all_applications
				return toOptions(databases.filter((database) => database.type === 'database'));
			},

			async getTableIds(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
				const jwtToken = await getJwtToken.call(this, credentials);
				const databaseId = this.getNodeParameter('databaseId', 0) as string;
				const endpoint = `/api/database/tables/database/${databaseId}/`;
				const tables = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					jwtToken,
				)) as LoadedResource[];
				return toOptions(tables);
			},

			async getTableFields(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
				const jwtToken = await getJwtToken.call(this, credentials);
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const endpoint = `/api/database/fields/table/${tableId}/`;
				const fields = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					jwtToken,
				)) as LoadedResource[];
				return toOptions(fields);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as Resource;
		const operation = this.getNodeParameter('operation', 0) as RowOperation | FileOperation;

		const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
		const jwtToken = await getJwtToken.call(this, credentials);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'row') {
					const tableId = this.getNodeParameter('tableId', 0) as string;
					const fields = await getTableFields.call(this, tableId, jwtToken);

					const mapper = new TableFieldMapper();
					mapper.createMappings(fields);

					if (operation === 'getAll') {
						// ----------------------------------
						//             getAll
						// ----------------------------------

						// https://api.baserow.io/api/redoc/#operation/list_database_table_rows

						const returnAll = this.getNodeParameter('returnAll', 0, false) as boolean;
						const limit = this.getNodeParameter('limit', 0, 0);

						const { order, filters, filterType, search } = this.getNodeParameter(
							'additionalOptions',
							i,
						) as GetAllAdditionalOptions;

						const qs: IDataObject = {};

						if (order?.fields) {
							qs.order_by = order.fields
								.map(({ field, direction }) => `${direction}${mapper.setField(field)}`)
								.join(',');
						}

						if (filters?.fields) {
							filters.fields.forEach(({ field, operator, value }) => {
								qs[`filter__field_${mapper.setField(field)}__${operator}`] = value;
							});
						}

						if (filterType) {
							qs.filter_type = filterType;
						}

						if (search) {
							qs.search = search;
						}

						const endpoint = `/api/database/rows/table/${tableId}/`;
						const rows = (await baserowApiRequestAllItems.call(
							this,
							'GET',
							endpoint,
							jwtToken,
							{},
							qs,
							returnAll,
							limit,
						)) as Row[];

						rows.forEach((row) => mapper.idsToNames(row));
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(rows),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'get') {
						// ----------------------------------
						//             get
						// ----------------------------------

						// https://api.baserow.io/api/redoc/#operation/get_database_table_row

						const rowId = this.getNodeParameter('rowId', i) as string;
						const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
						const row = await baserowApiRequest.call(this, 'GET', endpoint, jwtToken);

						mapper.idsToNames(row as Row);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(row as Row),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'create') {
						// ----------------------------------
						//             create
						// ----------------------------------

						// https://api.baserow.io/api/redoc/#operation/create_database_table_row

						const body: IDataObject = {};

						const dataToSend = this.getNodeParameter('dataToSend', 0) as
							| 'defineBelow'
							| 'autoMapInputData';

						if (dataToSend === 'autoMapInputData') {
							const incomingKeys = Object.keys(items[i].json);
							const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
							const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());

							for (const key of incomingKeys) {
								if (inputDataToIgnore.includes(key)) continue;
								body[key] = items[i].json[key];
								mapper.namesToIds(body);
							}
						} else {
							const fieldsUi = this.getNodeParameter(
								'fieldsUi.fieldValues',
								i,
								[],
							) as FieldsUiValues;
							for (const field of fieldsUi) {
								body[`field_${field.fieldId}`] = field.fieldValue;
							}
						}

						const endpoint = `/api/database/rows/table/${tableId}/`;
						const createdRow = await baserowApiRequest.call(this, 'POST', endpoint, jwtToken, body);

						mapper.idsToNames(createdRow as Row);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(createdRow as Row),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'update') {
						// ----------------------------------
						//             update
						// ----------------------------------

						// https://api.baserow.io/api/redoc/#operation/update_database_table_row

						const rowId = this.getNodeParameter('rowId', i) as string;

						const body: IDataObject = {};

						const dataToSend = this.getNodeParameter('dataToSend', 0) as
							| 'defineBelow'
							| 'autoMapInputData';

						if (dataToSend === 'autoMapInputData') {
							const incomingKeys = Object.keys(items[i].json);
							const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
							const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());

							for (const key of incomingKeys) {
								if (inputsToIgnore.includes(key)) continue;
								body[key] = items[i].json[key];
								mapper.namesToIds(body);
							}
						} else {
							const fieldsUi = this.getNodeParameter(
								'fieldsUi.fieldValues',
								i,
								[],
							) as FieldsUiValues;
							for (const field of fieldsUi) {
								body[`field_${field.fieldId}`] = field.fieldValue;
							}
						}

						const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
						const updatedRow = await baserowApiRequest.call(
							this,
							'PATCH',
							endpoint,
							jwtToken,
							body,
						);

						mapper.idsToNames(updatedRow as Row);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(updatedRow as Row),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (resource === 'row' && operation === 'delete') {
						// ----------------------------------
						//             delete
						// ----------------------------------

						// https://api.baserow.io/api/redoc/#operation/delete_database_table_row

						const rowId = this.getNodeParameter('rowId', i) as string;

						const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
						await baserowApiRequest.call(this, 'DELETE', endpoint, jwtToken);

						const executionData = this.helpers.constructExecutionMetaData(
							[{ json: { success: true } }],
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				} else if (resource === 'file') {
					if (operation === 'upload-via-url') {
						// ----------------------------------
						//             upload-via-url
						// ----------------------------------

						// https://api.baserow.io/api/redoc/#tag/User-files/operation/upload_via_url

						const url = this.getNodeParameter('url', i) as string;
						const endpoint = '/api/user-files/upload-via-url/';
						const body = { url };
						const file = await baserowApiRequest.call(this, 'POST', endpoint, jwtToken, body);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(file),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'upload') {
						// ----------------------------------
						//             upload
						// ----------------------------------

						// https://api.baserow.io/api/redoc/#tag/User-files/operation/upload_file

						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
						const { fileName, mimeType } = this.helpers.assertBinaryData(i, binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						const file = await baserowFileUploadRequest.call(
							this,
							jwtToken,
							binaryDataBuffer,
							fileName as string,
							mimeType,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(file),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {}, itemIndex: i });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
