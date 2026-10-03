import type { INodeProperties } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@n8n/ai-utilities';

import { AuthenticationType } from './types';

export const properties: INodeProperties[] = [
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		default: AuthenticationType.ApiKey,
		options: [
			{
				name: 'API Key',
				value: AuthenticationType.ApiKey,
			},
			{
				name: 'Azure Entra ID (OAuth2)',
				value: AuthenticationType.EntraOAuth2,
			},
		],
	},
	getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
	{
		displayName:
			'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure to select latest models released post November 2023.',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				'/options.responseFormat': ['json_object'],
			},
		},
	},
	{
		displayName: 'Project',
		name: 'project',
		type: 'string',
		description:
			'The Azure AI Foundry project that owns the deployment. Required for an Azure AI Foundry resource; leave empty for a classic Azure OpenAI resource.',
		default: '',
	},
	{
		displayName: 'Model (Deployment) Name',
		name: 'model',
		type: 'string',
		description: 'The name of the model(deployment) to use (e.g., gpt-4, gpt-35-turbo)',
		required: true,
		default: '',
		displayOptions: {
			show: {
				'@version': [1],
			},
		},
	},
	{
		displayName: 'Model (Deployment)',
		name: 'model',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		builderHint: {
			propertyHint:
				'Set the project parameter before you list deployments. The list needs an Azure AI Foundry credential. With a classic credential, use the id mode and enter the deployment name.',
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a deployment...',
				typeOptions: {
					searchListMethod: 'searchModels',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. gpt-4o',
			},
		],
		description:
			'The deployment to use. Choose from the list (Azure AI Foundry credentials only), or enter the deployment name.',
		displayOptions: {
			show: {
				'@version': [{ _cnd: { gte: 1.1 } }],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
				type: 'number',
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				default: -1,
				description:
					'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768). Use -1 for default.',
				type: 'number',
				typeOptions: {
					maxValue: 128000,
				},
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				default: 'text',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Regular text response',
					},
					{
						name: 'JSON',
						value: 'json_object',
						description:
							'Enables JSON mode, which should guarantee the message the model generates is valid JSON',
					},
				],
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
				type: 'number',
			},
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				default: 0.7,
				typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 }, // Max temp can be 2
				description:
					'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
				type: 'number',
			},
			{
				displayName: 'Timeout (Ms)',
				name: 'timeout',
				default: 60000,
				description: 'Maximum amount of time a request is allowed to take in milliseconds',
				type: 'number',
			},
			{
				displayName: 'Max Retries',
				name: 'maxRetries',
				default: 2,
				description: 'Maximum number of retries to attempt on failure',
				type: 'number',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
			},
		],
	},
];
