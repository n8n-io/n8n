import type { INodeProperties } from 'n8n-workflow';

export const openAiFunctionsAgentProperties: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		displayOptions: {
			show: {
				agent: ['openAiFunctionsAgent'],
			},
		},
		default: '={{ $json.input }}',
	},
];
