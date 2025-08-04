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
				'@version': [1],
			},
		},
		default: '={{ $json.input }}',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['conversationalAgent'],
				'@version': [1.1],
			},
		},
		default: '={{ $json.chat_input }}',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['conversationalAgent'],
				'@version': [1.2],
			},
		},
		default: '={{ $json.chatInput }}',
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
			{
				displayName: 'Max Iterations',
				name: 'maxIterations',
				type: 'number',
				default: 10,
				description: 'The maximum number of iterations the agent will run before stopping',
			},
			{
				displayName: 'Return Intermediate Steps',
				name: 'returnIntermediateSteps',
				type: 'boolean',
				default: false,
				description: 'Whether or not the output should include intermediate steps the agent took',
			},
		],
	},
];
