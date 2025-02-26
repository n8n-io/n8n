import type { INodeProperties } from 'n8n-workflow';

import * as close from './close.operation';
import * as create from './create.operation';
import * as getScreenshot from './getScreenshot.operation';
import * as load from './load.operation';

export { create, close, getScreenshot, load };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['window'],
			},
		},
		options: [
			{
				name: 'Close',
				value: 'close',
				description: 'Close a window',
				action: 'Close a window',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new window',
				action: 'Create a window',
			},
			{
				name: 'Get Screenshot',
				value: 'getScreenshot',
				description: 'Get a screenshot of the current window',
				action: 'Get screenshot',
			},
			{
				name: 'Load URL',
				value: 'load',
				description: 'Load a page in the window',
				action: 'Load a page',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['window'],
			},
		},
		default: '={{ $json["sessionId"] }}',
		description: 'The ID of the session',
	},
	...close.description,
	...create.description,
	...getScreenshot.description,
	...load.description,
];
