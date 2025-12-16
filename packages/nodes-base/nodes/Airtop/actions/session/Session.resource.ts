import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as save from './save.operation';
import * as terminate from './terminate.operation';
import * as waitForDownload from './waitForDownload.operation';

export { create, save, terminate, waitForDownload };

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
			{
				name: 'Wait for Download',
				value: 'waitForDownload',
				description: 'Wait for a file download to become available',
				action: 'Wait for a download',
			},
		],
		default: 'create',
	},
	...create.description,
	...save.description,
	...terminate.description,
	...waitForDownload.description,
];
