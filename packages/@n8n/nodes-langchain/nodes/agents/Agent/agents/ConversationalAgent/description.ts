import type { INodeProperties } from 'n8n-workflow';

export const conversationalAgentProperties: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		displayOptions: {
			show: {
				agent: ['conversationalAgent'],
			},
		},
		default: '={{ $json.input }}',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				agent: ['conversationalAgent'],
			},
		},
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				default:
					'Do your best to answer the questions. Feel free to use any tools available to look up relevant information, only if necessary.',
				description: 'The message that will be sent to the agent before the conversation starts',
				typeOptions: {
					rows: 3,
				},
			},
		],
	},
];
