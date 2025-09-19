import type { INodeProperties } from 'n8n-workflow';

import { HUMAN_MESSAGE_TEMPLATE, PREFIX, SUFFIX, SUFFIX_CHAT } from './prompt';

export const reActAgentAgentProperties: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['reActAgent'],
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
				agent: ['reActAgent'],
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
				agent: ['reActAgent'],
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
				agent: ['reActAgent'],
			},
		},
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Human Message Template',
				name: 'humanMessageTemplate',
				type: 'string',
				default: HUMAN_MESSAGE_TEMPLATE,
				description: 'String to use directly as the human message template',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: 'Prefix Message',
				name: 'prefix',
				type: 'string',
				default: PREFIX,
				description: 'String to put before the list of tools',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: 'Suffix Message for Chat Model',
				name: 'suffixChat',
				type: 'string',
				default: SUFFIX_CHAT,
				description:
					'String to put after the list of tools that will be used if chat model is used',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: 'Suffix Message for Regular Model',
				name: 'suffix',
				type: 'string',
				default: SUFFIX,
				description:
					'String to put after the list of tools that will be used if regular model is used',
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
