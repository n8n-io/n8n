import type { INodeProperties } from 'n8n-workflow';

import * as textToSpeech from './tts.operation';

export { textToSpeech };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['audio'],
			},
		},
		options: [
			{
				name: 'Text to Speech',
				value: 'textToSpeech',
				action: 'Convert text to speech',
				description: 'Generate speech audio from text input',
			},
		],
		default: 'textToSpeech',
	},
	...textToSpeech.description,
];
