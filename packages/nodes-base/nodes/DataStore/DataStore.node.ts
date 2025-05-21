import type {
	FieldTypeMap,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { rowDescriptions, rowOperations } from './descriptions/row.description';
import { tableDescriptions, tableOperations } from './descriptions/table.description';

export class DataStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Store',
		name: 'dataStore',
		icon: 'fa:table',
		iconColor: 'orange',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'Data Store ',
		defaults: {
			name: 'Data Store',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Table',
						value: 'table',
					},
					{
						name: 'Row',
						value: 'row',
					},
				],
				default: 'table',
			},
			tableOperations,
			rowOperations,
			...tableDescriptions,
			...rowDescriptions,
		],
	};

	methods = {
		listSearch: {
			async tableSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const response =
					((await this.helpers.httpRequest({
						method: 'GET',
						url: 'https://mishakret.app.n8n.cloud/webhook/datastore',
					})) as IDataObject[]) ?? [];

				const results = response.map((row: IDataObject) => {
					return {
						name: row.name as string,
						value: row.id as string,
					};
				});

				return {
					results,
				};
			},
		},
		resourceMapping: {
			async getColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const id = this.getNodeParameter('tableId', '', { extractValue: true }) as string;

				const response =
					((await this.helpers.httpRequest({
						method: 'GET',
						url: `https://mishakret.app.n8n.cloud/webhook/657be5c2-bd0f-4bd0-88b8-4dd925b8732a/datastores/${id}/columns`,
					})) as IDataObject[]) ?? [];

				const fields: ResourceMapperField[] = [];

				for (const column of response) {
					const type = column.type as keyof FieldTypeMap;

					fields.push({
						id: column.id as string,
						displayName: column.name as string,
						required: false,
						defaultMatch: false,
						display: true,
						type,
						readOnly: false,
						removed: false,
					});
				}

				return { fields };
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const resource = this.getNodeParameter('resource', 0, 'table');
		const operation = this.getNodeParameter('operation', 0, 'create');

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'table') {
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i, '') as string;
						const columns = this.getNodeParameter('columns.values', i, '');

						const response = (await this.helpers.httpRequest({
							method: 'POST',
							url: 'https://mishakret.app.n8n.cloud/webhook/datastore',
							body: {
								name,
								columns,
							},
						})) as IDataObject;

						returnData.push({
							json: response,
						});
					}
					if (operation === 'getAll') {
						const response = (await this.helpers.httpRequest({
							method: 'GET',
							url: 'https://mishakret.app.n8n.cloud/webhook/datastore',
						})) as IDataObject[];

						(response ?? []).forEach((item) => {
							returnData.push({
								json: item,
							});
						});
					}
					if (operation === 'get') {
						const id = this.getNodeParameter('tableId', i, '', { extractValue: true }) as string;
						const response = (await this.helpers.httpRequest({
							method: 'GET',
							url: `https://nikhilkuriakose.app.n8n.cloud/webhook/78e49f0d-75bb-4307-b3f8-0cfedc38b28c/datastore/${id}`,
						})) as IDataObject;

						returnData.push({
							json: response,
						});
					}
					if (operation === 'delete') {
						const id = this.getNodeParameter('tableId', i, '', { extractValue: true }) as string;
						const response = (await this.helpers.httpRequest({
							method: 'DELETE',
							url: `https://mishakret.app.n8n.cloud/webhook/657be5c2-bd0f-4bd0-88b8-4dd925b8732a/datastore/${id}`,
						})) as IDataObject;

						returnData.push({
							json: response,
						});
					}
				}
				if (resource === 'row') {
					if (operation === 'add') {
						const dataMode = this.getNodeParameter('columns.mappingMode', 0) as string;
						const tableId = this.getNodeParameter('tableId', i, '', {
							extractValue: true,
						}) as string;

						let data: IDataObject;

						if (dataMode === 'autoMapInputData') {
							data = items[i].json;
						} else {
							const fields = this.getNodeParameter('columns.value', i, {}) as IDataObject;

							data = fields;
						}

						const response = (await this.helpers.httpRequest({
							method: 'PUT',
							url: `https://nikhilkuriakose.app.n8n.cloud/webhook/78e49f0d-75bb-4307-b3f8-0cfedc38b28c/datastore/${tableId}/record`,
							body: data,
						})) as IDataObject;

						returnData.push({
							json: response,
						});
					}
					if (operation === 'get') {
						const tableId = this.getNodeParameter('tableId', i, '', {
							extractValue: true,
						}) as string;

						const response = (await this.helpers.httpRequest({
							method: 'GET',
							url: `https://nikhilkuriakose.app.n8n.cloud/webhook/78e49f0d-75bb-4307-b3f8-0cfedc38b28c/datastore/${tableId}/records`,
						})) as IDataObject[];

						(response ?? []).forEach((item) => {
							returnData.push({
								json: item,
							});
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as JsonObject).message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
