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

import { rowOperations, rowFields } from './RowDescription';

// TODO: hide this node
export class DataStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Store',
		name: 'dataStore',
		icon: 'fa:table',
		iconColor: 'orange',
		group: ['transform'], // ?
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'Save data across workflow executions in a table',
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
						name: 'Row',
						value: 'row',
					},
				],
				default: 'row',
			},
			...rowOperations,
			...rowFields,
		],
	};

	methods = {
		listSearch: {
			async tableSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const baseUrl = this.getRestApiUrl().replace(/localhost/, '127.0.0.1');
				const response = (await this.helpers.httpRequest({
					method: 'GET',
					url: baseUrl + '/data-store',
				})) as { data: { count: number; data: IDataObject[] } };

				const results = (response.data.data ?? []).map((row: IDataObject) => {
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
				const baseUrl = this.getRestApiUrl().replace(/localhost/, '127.0.0.1');

				const response = (await this.helpers.httpRequest({
					method: 'GET',
					url: baseUrl + `/data-store/${id}/get-columns`,
				})) as { data: IDataObject[] };

				const fields: ResourceMapperField[] = [];

				for (const field of response?.data ?? []) {
					const type = field.type as keyof FieldTypeMap;

					fields.push({
						id: field.name as string,
						displayName: field.name as string,
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
		const baseUrl = this.getRestApiUrl().replace(/localhost/, '127.0.0.1');

		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const resource = this.getNodeParameter('resource', 0, 'table');
		const operation = this.getNodeParameter('operation', 0, 'create');

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'row') {
					if (operation === 'insert') {
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
							method: 'POST',
							url: baseUrl + `/data-store/${tableId}/append`,
							body: { records: [data] },
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
							url: baseUrl + `/data-store/${tableId}/get-rows`,
						})) as { data: IDataObject[] };

						(response?.data ?? []).forEach((item) => {
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
