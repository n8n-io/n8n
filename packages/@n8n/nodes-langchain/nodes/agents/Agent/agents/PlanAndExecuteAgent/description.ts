import type { INodeProperties } from 'n8n-workflow';

import { DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE } from './prompt';

export const planAndExecuteAgentProperties: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				agent: ['planAndExecuteAgent'],
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
				agent: ['planAndExecuteAgent'],
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
				agent: ['planAndExecuteAgent'],
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
				agent: ['planAndExecuteAgent'],
			},
		},
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Human Message Template',
				name: 'humanMessageTemplate',
				type: 'string',
				default: DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE,
				description: 'The message that will be sent to the agent during each step execution',
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: 'Tracing Metadata',
				name: 'tracingMetadata',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Metadata',
				description: 'Custom metadata added to tracing events',
				options: [
					{
						displayName: 'Metadata',
						name: 'values',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},
];
