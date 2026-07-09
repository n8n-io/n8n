import type { INodeProperties } from 'n8n-workflow';

import * as run from './run.operation';

export { run };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['agent'],
			},
		},
		options: [
			{
				name: 'Run',
				value: 'run',
				description: 'Run an Airtop agent',
				action: 'Run an agent',
			},
		],
		default: 'run',
	},
	...run.description,
];
