import type {
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
				const proxy = await this.helpers.getDataStoreProxy();
				const result = await proxy.getManyAndCount({ take: 10000 });

				const results = result.data.map((row) => {
					return {
						name: row.name,
						value: row.id,
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
				const proxy = await this.helpers.getDataStoreProxy(id);
				const result = await proxy.getColumns();

				const fields: ResourceMapperField[] = [];

				for (const field of result) {
					const type = field.type === 'date' ? 'dateTime' : field.type;

					fields.push({
						id: field.name,
						displayName: field.name,
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
				if (resource === 'row') {
					const tableId = this.getNodeParameter('tableId', i, '', {
						extractValue: true,
					}) as string;
					const dataStoreProxy = await this.helpers.getDataStoreProxy(tableId);
					if (operation === 'insert') {
						const dataMode = this.getNodeParameter('columns.mappingMode', 0) as string;

						let data: IDataObject;

						if (dataMode === 'autoMapInputData') {
							data = items[i].json;
						} else {
							const fields = this.getNodeParameter('columns.value', i, {}) as IDataObject;

							data = fields;
						}
						const response = await dataStoreProxy.appendRows([data as never]);
						if (response)
							returnData.push({
								json: data,
							});
					}
					if (operation === 'get') {
						const response = await dataStoreProxy.getManyAndCount({});

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
