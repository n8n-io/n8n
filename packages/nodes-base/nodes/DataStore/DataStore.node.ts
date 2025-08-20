import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { router } from './actions/router';
import * as row from './actions/row/Row.resource';
import { DATA_STORE_ID_FIELD } from './common/fields';

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
			...row.description,
		],
	};

	methods = {
		listSearch: {
			async tableSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				if (this.helpers.getDataStoreAggregateProxy === undefined) return { results: [] };

				const proxy = await this.helpers.getDataStoreAggregateProxy();
				const result = await proxy.getManyAndCount({ take: 1000000 });

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
				if (this.helpers.getDataStoreProxy === undefined) return { fields: [] };

				const dataStoreId = this.getNodeParameter(DATA_STORE_ID_FIELD, '', {
					extractValue: true,
				}) as string;
				const proxy = await this.helpers.getDataStoreProxy(dataStoreId);
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
		return await router.call(this);
	}
}
