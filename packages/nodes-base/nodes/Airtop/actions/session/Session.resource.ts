import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as terminate from './terminate.operation';

export { create, terminate };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['session'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new session',
				action: 'Create a session',
			},
			{
				name: 'Terminate',
				value: 'terminate',
				description: 'Terminate a session',
				action: 'Terminate a session',
			},
		],
		default: 'create',
	},
	...create.description,
	...terminate.description,
];
