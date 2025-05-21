import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
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

	async execute(this: IExecuteFunctions) {
		return [];
	}
}
