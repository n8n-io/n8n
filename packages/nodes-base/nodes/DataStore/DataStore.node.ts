import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { router } from './actions/router';
import * as row from './actions/row/Row.resource';
import { getDataStoreColumns, getDataStores, tableSearch } from './common/methods';

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
			tableSearch,
		},
		loadOptions: {
			getDataStoreColumns,
		},
		resourceMapping: {
			getDataStores,
		},
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
