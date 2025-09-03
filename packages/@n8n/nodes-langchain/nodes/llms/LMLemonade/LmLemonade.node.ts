import { OpenAI } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { lemonadeDescription, lemonadeModel, lemonadeOptions } from './description';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmLemonade implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lemonade Model',

		name: 'lmLemonade',
		icon: 'file:lemonade.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Lemonade',
		defaults: {
			name: 'Lemonade Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Text Completion Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmlemonade/',
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
		const credentials = await this.getCredentials('lemonadeApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as object;

		// Process stop sequences
		let stop: string[] | undefined;
		if ((options as any).stop) {
			const stopString = (options as any).stop as string;
			stop = stopString
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
		}

		// Ensure we have an API key for OpenAI client validation
		const apiKey = credentials.apiKey || 'lemonade-placeholder-key';

		// Build configuration with explicit apiKey
		const config: any = {
			apiKey,
			modelName,
			temperature: (options as any).temperature,
			topP: (options as any).topP,
			frequencyPenalty: (options as any).frequencyPenalty,
			presencePenalty: (options as any).presencePenalty,
			maxTokens: (options as any).maxTokens > 0 ? (options as any).maxTokens : undefined,
			stop,
			configuration: {
				baseURL: credentials.baseUrl as string,
			},
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		};

		// Add custom headers if API key is provided
		if (credentials.apiKey) {
			config.configuration.defaultHeaders = {
				Authorization: `Bearer ${credentials.apiKey as string}`,
			};
		}

		const model = new OpenAI(config);

		return {
			response: model,
		};
	}
}
