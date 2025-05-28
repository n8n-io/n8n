import type { INodeProperties } from 'n8n-workflow';

import * as close from './close.operation';
import * as create from './create.operation';
import * as load from './load.operation';
import * as takeScreenshot from './takeScreenshot.operation';
import { sessionIdField, windowIdField } from '../common/fields';

export { create, close, takeScreenshot, load };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		typeOptions: {
			sortable: false,
		},
		displayOptions: {
			show: {
				resource: ['window'],
			},
		},
		options: [
			{
				name: 'Create a New Browser Window',
				value: 'create',
				description: 'Create a new browser window inside a session. Can load a URL when created.',
				action: 'Create a window',
			},
			{
				name: 'Load URL',
				value: 'load',
				description: 'Load a URL in an existing window',
				action: 'Load a page',
			},
			{
				name: 'Take Screenshot',
				value: 'takeScreenshot',
				description: 'Take a screenshot of the current window',
				action: 'Take screenshot',
			},
			{
				name: 'Close Window',
				value: 'close',
				description: 'Close a window inside a session',
				action: 'Close a window',
			},
		],
		default: 'create',
	},
	{
		...sessionIdField,
		displayOptions: {
			show: {
				resource: ['window'],
			},
		},
	},
	{
		...windowIdField,
		displayOptions: {
			show: {
				resource: ['window'],
				operation: ['close', 'takeScreenshot', 'load'],
			},
		},
	},
	...create.description,
	...load.description,
	...takeScreenshot.description,
];
