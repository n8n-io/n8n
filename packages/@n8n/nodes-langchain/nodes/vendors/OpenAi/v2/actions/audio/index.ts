import type { INodeProperties } from 'n8n-workflow';

import * as generate from './generate.operation';
import * as transcribe from './transcribe.operation';
import * as translate from './translate.operation';

export { generate, transcribe, translate };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generate Audio',
				value: 'generate',
				action: 'Generate audio',
				description: 'Creates audio from a text prompt',
			},
			{
				name: 'Transcribe a Recording',
				value: 'transcribe',
				action: 'Transcribe a recording',
				description: 'Transcribes audio into the text',
			},
			{
				name: 'Translate a Recording',
				value: 'translate',
				action: 'Translate a recording',
				description: 'Translate audio into the text in the english language',
			},
		],
		default: 'generate',
		displayOptions: {
			show: {
				resource: ['audio'],
			},
		},
	},
	{
		displayName: 'OpenAI API limits the size of the audio file to 25 MB',
		name: 'fileSizeLimitNotice',
		type: 'notice',
		default: ' ',
		displayOptions: {
			show: {
				resource: ['audio'],
				operation: ['translate', 'transcribe'],
			},
		},
	},
	...generate.description,
	...transcribe.description,
	...translate.description,
];
