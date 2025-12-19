import type { INodeProperties } from 'n8n-workflow';

import * as analyze from './analyze.operation';
import * as edit from './edit.operation';
import * as generate from './generate.operation';

export { analyze, generate, edit };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Analyze Image',
				value: 'analyze',
				action: 'Analyze an image',
				description: 'Take in images and answer questions about them',
			},
			{
				name: 'Generate an Image',
				value: 'generate',
				action: 'Generate an image',
				description: 'Creates an image from a text prompt',
			},
			{
				name: 'Edit Image',
				value: 'edit',
				action: 'Edit an image',
				description: 'Upload one or more images and apply edits based on a prompt',
			},
		],
		default: 'generate',
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
	},
	...analyze.description,
	...edit.description,
	...generate.description,
];
