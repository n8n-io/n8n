import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as save from './save.operation';
import * as terminate from './terminate.operation';

export { create, save, terminate };

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
				name: 'Create Session',
				value: 'create',
				description: 'Create an Airtop browser session',
				action: 'Create a session',
			},
			{
				name: 'Save Profile on Termination',
				value: 'save',
				description:
					'Save in a profile changes made in your browsing session such as cookies and local storage',
				action: 'Save a profile on session termination',
			},
			{
				name: 'Terminate Session',
				value: 'terminate',
				description: 'Terminate a session',
				action: 'Terminate a session',
			},
		],
		default: 'create',
	},
	...create.description,
	...save.description,
	...terminate.description,
];
