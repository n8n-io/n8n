import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import { getProxyAgent, makeN8nLlmFailedAttemptHandler, N8nLlmTracing } from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import type { LemonadeApiCredentialsType } from '../../../credentials/LemonadeApi.credentials';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { lemonadeModel, lemonadeOptions, lemonadeDescription } from '../LMLemonade/description';

export class LmChatLemonade implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lemonade Chat Model',

		name: 'lmChatLemonade',
		icon: 'file:lemonade.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Lemonade Chat',
		defaults: {
			name: 'Lemonade Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatlemonade/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		...lemonadeDescription,
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			lemonadeModel,
			lemonadeOptions,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = (await this.getCredentials('lemonadeApi')) as LemonadeApiCredentialsType;

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			temperature?: number;
			topP?: number;
			frequencyPenalty?: number;
			presencePenalty?: number;
			maxTokens?: number;
			stop?: string;
		};

		// Process stop sequences and maxTokens
		const processedOptions: {
			temperature?: number;
			topP?: number;
			frequencyPenalty?: number;
			presencePenalty?: number;
			maxTokens?: number;
			stop?: string[] | undefined;
		} = {
			...options,
			maxTokens: options.maxTokens && options.maxTokens > 0 ? options.maxTokens : undefined,
			stop: undefined, // Will be set below if options.stop exists
		};

		if (options.stop) {
			const stopSequences = options.stop
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			processedOptions.stop = stopSequences.length > 0 ? stopSequences : undefined;
		}

		// Build configuration object like official OpenAI node
		const configuration: ClientOptions = {
			baseURL: credentials.baseUrl,
		};

		// Add custom headers if API key is provided
		if (credentials.apiKey) {
			configuration.defaultHeaders = {
				Authorization: `Bearer ${credentials.apiKey}`,
			};
		}

		configuration.fetchOptions = {
			dispatcher: getProxyAgent(configuration.baseURL ?? '', {}),
		};

		const model = new ChatOpenAI({
			apiKey: credentials.apiKey || 'lemonade-placeholder-key',
			model: modelName,
			...processedOptions,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
