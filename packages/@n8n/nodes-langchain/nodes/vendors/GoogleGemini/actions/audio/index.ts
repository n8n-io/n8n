import type { INodeProperties } from 'n8n-workflow';

import * as analyze from './analyze.operation';
import * as transcribe from './transcribe.operation';

export { analyze, transcribe };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Analyze Audio',
				value: 'analyze',
				action: 'Analyze audio',
				description: 'Take in audio and answer questions about it',
			},
			{
				name: 'Transcribe a Recording',
				value: 'transcribe',
				action: 'Transcribe a recording',
				description: 'Transcribes audio into the text',
			},
		],
		default: 'transcribe',
		displayOptions: {
			show: {
				resource: ['audio'],
			},
		},
	},
	...analyze.description,
	...transcribe.description,
];
