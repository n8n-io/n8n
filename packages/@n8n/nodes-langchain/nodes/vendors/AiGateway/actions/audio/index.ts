import type { INodeProperties } from 'n8n-workflow';

import * as transcribe from './transcribe.operation';

export { transcribe };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Transcribe Audio',
				value: 'transcribe',
				action: 'Transcribe audio',
				description:
					'Describe or transcribe audio from a public URL (model must support audio input)',
			},
		],
		default: 'transcribe',
		displayOptions: {
			show: {
				resource: ['audio'],
			},
		},
	},
	...transcribe.description,
];
