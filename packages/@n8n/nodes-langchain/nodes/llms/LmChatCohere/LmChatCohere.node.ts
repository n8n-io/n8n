import { ChatCohere } from '@langchain/cohere';
import type { LLMResult } from '@langchain/core/outputs';
import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

export function tokensUsageParser(result: LLMResult): {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
} {
	let totalInputTokens = 0;
	let totalOutputTokens = 0;

	result.generations?.forEach((generationArray) => {
		generationArray.forEach((gen) => {
			const inputTokens = gen.generationInfo?.meta?.tokens?.inputTokens ?? 0;
			const outputTokens = gen.generationInfo?.meta?.tokens?.outputTokens ?? 0;

			totalInputTokens += inputTokens;
			totalOutputTokens += outputTokens;
		});
	});

	return {
		completionTokens: totalOutputTokens,
		promptTokens: totalInputTokens,
		totalTokens: totalInputTokens + totalOutputTokens,
	};
}

export class LmChatCohere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cohere Chat Model',
		name: 'lmChatCohere',
		icon: { light: 'file:cohere.svg', dark: 'file:cohere.dark.svg' },
		group: ['transform'],
		version: [1],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Cohere Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatcohere/',
					},
				],
			},
		},
		inputs: [],
		outputs: ['ai_languageModel'],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'cohereApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials?.url}}',
			headers: {
				accept: 'application/json',
				authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
		properties: [
			getConnectionHintNoticeField(['ai_chain', 'ai_agent']),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model which will generate the completion. <a href="https://docs.cohere.com/docs/models">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/v1/models?page_size=100&endpoint=chat',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'models',
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.name}}',
											value: '={{$responseItem.name}}',
											description: '={{$responseItem.description}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
					},
				},
				default: 'command-a-03-2025',
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
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{ url?: string; apiKey?: string }>('cohereApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxRetries: number;
			temperature?: number;
		};

		const model = new ChatCohere({
			apiKey: credentials.apiKey,
			model: modelName,
			temperature: options.temperature,
			maxRetries: options.maxRetries ?? 2,
			callbacks: [new N8nLlmTracing(this, { tokensUsageParser })],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
