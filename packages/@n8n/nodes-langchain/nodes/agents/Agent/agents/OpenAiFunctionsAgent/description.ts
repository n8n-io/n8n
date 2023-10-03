import type { INodeProperties } from 'n8n-workflow';
import { SYSTEM_MESSAGE } from './prompt';

export const openAiFunctionsAgentProperties: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['openAiFunctionsAgent'],
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
				agent: ['openAiFunctionsAgent'],
			},
		},
		default: {},
		placeholder: 'Add Option',
		options: [
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
