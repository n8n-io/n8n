import type { INodeProperties } from 'n8n-workflow';

import * as generate from './generate.operation';
import * as improve from './improve.operation';
import * as templatize from './templatize.operation';

export { generate, improve, templatize };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generate Prompt',
				value: 'generate',
				action: 'Generate a prompt',
				description: 'Generate a prompt for a model',
			},
			{
				name: 'Improve Prompt',
				value: 'improve',
				action: 'Improve a prompt',
				description: 'Improve a prompt for a model',
			},
			{
				name: 'Templatize Prompt',
				value: 'templatize',
				action: 'Templatize a prompt',
				description: 'Templatize a prompt for a model',
			},
		],
		default: 'generate',
		displayOptions: {
			show: {
				resource: ['prompt'],
			},
		},
	},
	{
		displayName:
			'The <a href="https://docs.anthropic.com/en/api/prompt-tools-generate">prompt tools APIs</a> are in a closed research preview. Your organization must request access to use them.',
		name: 'experimentalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['prompt'],
			},
		},
	},
	...generate.description,
	...improve.description,
	...templatize.description,
];
