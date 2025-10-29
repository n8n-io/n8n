import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type ICredentialTestFunctions,
	type ICredentialDataDecryptedObject,
	type INodeCredentialTestResult,
	type ICredentialsDecrypted,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	baserowApiRequest,
	baserowApiRequestAllItems,
	getAuthorizationHeader,
	TableFieldMapper,
	toOptions,
} from './GenericFunctions';
import { operationFields } from './OperationDescription';
import type {
	BaserowCredentials,
	FieldsUiValues,
	GetAllAdditionalOptions,
	LoadedResource,
	Operation,
	Row,
} from './types';

export class Baserow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Baserow',
		name: 'baserow',
		icon: 'file:baserow.svg',
		group: ['output'],
		version: [1, 1.1],
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
				testedBy: 'testBaserowCredentials',
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
						name: 'Batch Create',
						value: 'batchCreate',
						description: 'Create up to 200 rows in one request',
						action: 'Create multiple rows',
					},
					{
						name: 'Batch Delete',
						value: 'batchDelete',
						description: 'Delete up to 200 rows in one request',
						action: 'Delete multiple rows',
					},
					{
						name: 'Batch Update',
						value: 'batchUpdate',
						description: 'Update up to 200 rows in one request',
						action: 'Update multiple rows',
					},
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
			...operationFields,
		],
	};

	methods = {
		loadOptions: {
			async getDatabaseIds(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');

				if (credentials.authType === 'token') {
					// Databases cannot be listed with token auth, return a placeholder option.
					return [
						{
							name: 'No Databases Available (Token Auth)',
							value: 'no-database',
						},
					];
				}

				const authHeader = await getAuthorizationHeader.call(this, credentials);
				const endpoint = '/api/applications/';
				const databases = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					authHeader,
				)) as LoadedResource[];
				// Baserow has different types of applications, we only want the databases
				// https://api.baserow.io/api/redoc/#tag/Applications/operation/list_all_applications
				return toOptions(databases.filter((database) => database.type === 'database'));
			},

			async getTableIds(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
				const authHeader = await getAuthorizationHeader.call(this, credentials);

				let endpoint;
				if (credentials.authType === 'token') {
					endpoint = '/api/database/tables/all-tables/';
				} else {
					const databaseId = this.getNodeParameter('databaseId', 0) as string;
					endpoint = `/api/database/tables/database/${databaseId}/`;
				}
				const tables = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					authHeader,
				)) as LoadedResource[];
				return toOptions(tables);
			},

			async getTableFields(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
				const authHeader = await getAuthorizationHeader.call(this, credentials);
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const endpoint = `/api/database/fields/table/${tableId}/`;
				const fields = (await baserowApiRequest.call(
					this,
					'GET',
					endpoint,
					authHeader,
				)) as LoadedResource[];
				return toOptions(fields);
			},
		},

		credentialTest: {
			async testBaserowCredentials(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>,
			): Promise<INodeCredentialTestResult> {
				const data = credential.data as {
					authType: 'basic' | 'token';
					host: string;
					token?: string;
					username?: string;
					password?: string;
				};

				try {
					// Database token authentication
					if (data.authType === 'token') {
						if (!data.token) {
							return { status: 'Error', message: 'Missing token for token authentication.' };
						}

						await this.helpers.request({
							baseURL: data.host,
							url: '/api/database/tokens/check/',
							method: 'GET',
							headers: { Authorization: `Token ${data.token}` },
							json: true,
						});

						return { status: 'OK', message: 'Token authentication successful.' };
					}

					// JWT username + password authentication
					if (!data.username || !data.password) {
						return { status: 'Error', message: 'Missing username or password.' };
					}

					const response = await this.helpers.request({
						baseURL: data.host,
						url: '/api/user/token-auth/',
						method: 'POST',
						json: true,
						body: {
							username: data.username,
							password: data.password,
						},
					});

					if (response?.token) {
						return { status: 'OK', message: 'Username & password authentication successful.' };
					}

					return { status: 'Error', message: 'Authentication failed.' };
				} catch (error: any) {
					return {
						status: 'Error',
						message: error?.message ?? 'Connection test failed.',
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mapper = new TableFieldMapper();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as Operation;

		const tableId = this.getNodeParameter('tableId', 0) as string;
		const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');
		const authHeader = await getAuthorizationHeader.call(this, credentials);
		const fields = await mapper.getTableFields.call(this, tableId, authHeader);
		mapper.createMappings(fields);

		if (operation === 'batchCreate') {
			// ----------------------------------
			//           batchCreate
			// ----------------------------------

			// https://api.baserow.io/api/redoc/#tag/Database-table-rows/operation/batch_create_database_table_rows

			const dataToSend = this.getNodeParameter('dataToSend', 0) as
				| 'defineBelow'
				| 'autoMapInputData';
			const itemsPayload: IDataObject[] = [];

			if (dataToSend === 'autoMapInputData') {
				for (let i = 0; i < items.length; i++) {
					const body: IDataObject = {};
					const incomingKeys = Object.keys(items[i].json);
					const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
					const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());

					for (const key of incomingKeys) {
						if (inputDataToIgnore.includes(key)) continue;
						body[key] = items[i].json[key];
						mapper.namesToIds(body);
					}
					itemsPayload.push(body);
				}
			} else {
				const rowsUi = this.getNodeParameter('rowsUi.rowValues', 0, []) as Array<{
					fieldsUi: { fieldValues: Array<{ fieldId: string; fieldValue: string }> };
				}>;
				for (const row of rowsUi) {
					const body: IDataObject = {};
					for (const field of row.fieldsUi.fieldValues) {
						body[`field_${field.fieldId}`] = field.fieldValue;
					}
					itemsPayload.push(body);
				}
			}

			const endpoint = `/api/database/rows/table/${tableId}/batch/`;
			const response = await baserowApiRequest.call(this, 'POST', endpoint, authHeader, {
				items: itemsPayload,
			});

			response.items.forEach((row: Row) => mapper.idsToNames(row));
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response.items),
				{ itemData: { item: 0 } },
			);
			returnData.push.apply(returnData, executionData);
			return [returnData];
		}

		if (operation === 'batchUpdate') {
			// ----------------------------------
			//           batchUpdate
			// ----------------------------------

			// https://api.baserow.io/api/redoc/#tag/Database-table-rows/operation/batch_update_database_table_rows

			const dataToSend = this.getNodeParameter('dataToSend', 0) as
				| 'defineBelow'
				| 'autoMapInputData';
			const itemsPayload: IDataObject[] = [];

			if (dataToSend === 'autoMapInputData') {
				for (let i = 0; i < items.length; i++) {
					const body: IDataObject = {};
					body.id = items[i].json.id;

					const incomingKeys = Object.keys(items[i].json);
					const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
					const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());

					for (const key of incomingKeys) {
						if (inputDataToIgnore.includes(key)) continue;
						body[key] = items[i].json[key];
						mapper.namesToIds(body);
					}
					itemsPayload.push(body);
				}
			} else {
				const rowsUi = this.getNodeParameter('rowsUi.rowValues', 0, []) as Array<{
					id: string;
					fieldsUi: { fieldValues: Array<{ fieldId: string; fieldValue: string }> };
				}>;
				for (const row of rowsUi) {
					const body: IDataObject = { id: row.id };
					for (const field of row.fieldsUi.fieldValues) {
						body[`field_${field.fieldId}`] = field.fieldValue;
					}
					itemsPayload.push(body);
				}
			}

			const endpoint = `/api/database/rows/table/${tableId}/batch/`;
			const response = await baserowApiRequest.call(this, 'PATCH', endpoint, authHeader, {
				items: itemsPayload,
			});

			response.items.forEach((row: Row) => mapper.idsToNames(row));
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response.items),
				{ itemData: { item: 0 } },
			);
			returnData.push.apply(returnData, executionData);
			return [returnData];
		}

		if (operation === 'batchDelete') {
			// ----------------------------------
			//           batchDelete
			// ----------------------------------

			// https://api.baserow.io/api/redoc/#tag/Database-table-rows/operation/batch_delete_database_table_rows

			const dataToSend = this.getNodeParameter('dataToSend', 0) as
				| 'defineBelow'
				| 'autoMapInputData';
			let ids: string[];

			if (dataToSend === 'autoMapInputData') {
				const propertyName = this.getNodeParameter('rowIdProperty', 0) as string;
				ids = items.map((item) => {
					return String(item.json[propertyName]);
				});
			} else {
				ids = this.getNodeParameter('rowIds', 0) as string[];
			}

			const endpoint = `/api/database/rows/table/${tableId}/batch-delete/`;
			await baserowApiRequest.call(this, 'POST', endpoint, authHeader, { items: ids });

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray([{ success: true, deleted: ids }]),
				{ itemData: { item: 0 } },
			);
			returnData.push(...executionData);
			return [returnData];
		}

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'getAll') {
					// ----------------------------------
					//             getAll
					// ----------------------------------

					// https://api.baserow.io/api/redoc/#operation/list_database_table_rows

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
						authHeader,
						{},
						qs,
					)) as Row[];

					rows.forEach((row) => mapper.idsToNames(row));
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(rows),
						{ itemData: { item: i } },
					);
					returnData.push.apply(returnData, executionData);
				} else if (operation === 'get') {
					// ----------------------------------
					//             get
					// ----------------------------------

					// https://api.baserow.io/api/redoc/#operation/get_database_table_row

					const rowId = this.getNodeParameter('rowId', i) as string;
					const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
					const row = await baserowApiRequest.call(this, 'GET', endpoint, authHeader);

					mapper.idsToNames(row as Row);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(row as Row),
						{ itemData: { item: i } },
					);
					returnData.push.apply(returnData, executionData);
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
						const fieldsUi = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
						for (const field of fieldsUi) {
							body[`field_${field.fieldId}`] = field.fieldValue;
						}
					}

					const endpoint = `/api/database/rows/table/${tableId}/`;
					const createdRow = await baserowApiRequest.call(this, 'POST', endpoint, authHeader, body);

					mapper.idsToNames(createdRow as Row);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(createdRow as Row),
						{ itemData: { item: i } },
					);
					returnData.push.apply(returnData, executionData);
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
						const fieldsUi = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
						for (const field of fieldsUi) {
							body[`field_${field.fieldId}`] = field.fieldValue;
						}
					}

					const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
					const updatedRow = await baserowApiRequest.call(
						this,
						'PATCH',
						endpoint,
						authHeader,
						body,
					);

					mapper.idsToNames(updatedRow as Row);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(updatedRow as Row),
						{ itemData: { item: i } },
					);
					returnData.push.apply(returnData, executionData);
				} else if (operation === 'delete') {
					// ----------------------------------
					//             delete
					// ----------------------------------

					// https://api.baserow.io/api/redoc/#operation/delete_database_table_row

					const rowId = this.getNodeParameter('rowId', i) as string;

					const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
					await baserowApiRequest.call(this, 'DELETE', endpoint, authHeader);

					const executionData = this.helpers.constructExecutionMetaData(
						[{ json: { success: true } }],
						{ itemData: { item: i } },
					);
					returnData.push.apply(returnData, executionData);
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
