import type { INodeProperties } from 'n8n-workflow';

export const reActAgentAgentProperties: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		displayOptions: {
			show: {
				agent: ['reActAgent'],
			},
		},
		default: '={{ $json.input }}',
	},
];
