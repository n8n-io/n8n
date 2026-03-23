import type { INodeProperties } from 'n8n-workflow';

import { SYSTEM_MESSAGE } from './prompt';

export const commonOptions: INodeProperties[] = [
	{
		displayName: 'System Message',
		name: 'systemMessage',
		type: 'string',
		default: SYSTEM_MESSAGE,
		description: 'The message that will be sent to the agent before the conversation starts',
		builderHint: {
			message:
				"Must include: agent's purpose, exact names of connected tools, and response instructions",
		},
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
	{
		displayName: 'Automatically Passthrough Binary Images',
		name: 'passthroughBinaryImages',
		type: 'boolean',
		default: true,
		description:
			'Whether or not binary images should be automatically passed through to the agent as image type messages',
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
						displayName: 'Type',
						name: 'type',
						type: 'options',
						description: 'The field value type',
						options: [
							{
								name: 'Array',
								value: 'arrayValue',
							},
							{
								name: 'Boolean',
								value: 'booleanValue',
							},
							{
								name: 'Number',
								value: 'numberValue',
							},
							{
								name: 'Object',
								value: 'objectValue',
							},
							{
								name: 'String',
								value: 'stringValue',
							},
						],
						default: 'stringValue',
					},
					{
						displayName: 'Value',
						name: 'stringValue',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								type: ['stringValue'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'numberValue',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								type: ['numberValue'],
							},
						},
						validateType: 'number',
					},
					{
						displayName: 'Value',
						name: 'booleanValue',
						type: 'options',
						default: 'true',
						options: [
							{
								name: 'True',
								value: 'true',
							},
							{
								name: 'False',
								value: 'false',
							},
						],
						displayOptions: {
							show: {
								type: ['booleanValue'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'arrayValue',
						type: 'string',
						default: '',
						placeholder: 'e.g. [ arrayItem1, arrayItem2, arrayItem3 ]',
						displayOptions: {
							show: {
								type: ['arrayValue'],
							},
						},
						validateType: 'array',
					},
					{
						displayName: 'Value',
						name: 'objectValue',
						type: 'json',
						default: '={}',
						typeOptions: {
							rows: 2,
						},
						displayOptions: {
							show: {
								type: ['objectValue'],
							},
						},
						validateType: 'object',
					},
				],
			},
		],
	},
];
