import type { INodeProperties } from 'n8n-workflow';

export const planAndExecuteAgentProperties: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['planAndExecuteAgent'],
			},
		},
		default: '={{ $json.input }}',
	},
];
