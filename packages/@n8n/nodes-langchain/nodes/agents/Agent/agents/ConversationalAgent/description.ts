import type { INodeProperties } from 'n8n-workflow';
import { SYSTEM_MESSAGE, HUMAN_MESSAGE } from './prompt';

export const conversationalAgentProperties: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
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
				displayName: 'Human Message',
				name: 'humanMessage',
				type: 'string',
				default: HUMAN_MESSAGE,
				description: 'The message that will provide the agent with a list of tools to use',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				default: SYSTEM_MESSAGE,
				description: 'The message that will be sent to the agent before the conversation starts',
				typeOptions: {
					rows: 6,
				},
			},
		],
	},
];
