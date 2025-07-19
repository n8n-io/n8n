import { ChatCerebras, type ChatCerebrasInput } from '@langchain/cerebras';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { searchModels } from './methods/loadModels';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmChatCerebras implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Cerebras Chat Model',

		name: 'lmChatCerebras',
		icon: { light: 'file:cerebrasLight.svg', dark: 'file:cerebrasLight.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Cerebras Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatcerebras/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'cerebrasApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials?.baseURL || "https://api.cerebras.ai/v1" }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'llama-3.3-70b' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model...',
						typeOptions: {
							searchListMethod: 'searchModels',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'llama3.3-70b',
					},
				],
				description: 'The model. Choose from the list, or specify an ID.',
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
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: -1,
						description: 'The maximum number of tokens to generate in the completion.',
						type: 'number',
						typeOptions: {
							maxValue: 8192,
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
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt',
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
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('cerebrasApi');

		const modelName = this.getNodeParameter('model.value', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxTokens?: number;
			maxRetries?: number;
			timeout?: number;
			temperature?: number;
			topP?: number;
			responseFormat?: 'text' | 'json_object';
		};

		const configuration: ChatCerebrasInput = {
			apiKey: credentials.apiKey as string,
			model: modelName,
			...options,
			timeout: options.timeout ?? 60000,
			maxRetries: options.maxRetries ?? 2,
			callbacks: [new N8nLlmTracing(this)],
		};

		// Handle response format
		if (options.responseFormat === 'json_object') {
			configuration.modelKwargs = { response_format: { type: 'json_object' } };
		}

		// Set base URL if provided in credentials
		if (credentials.baseURL) {
			configuration.baseURL = credentials.baseURL as string;
		}

		const model = new ChatCerebras(configuration);

		return {
			response: model,
		};
	}
}
