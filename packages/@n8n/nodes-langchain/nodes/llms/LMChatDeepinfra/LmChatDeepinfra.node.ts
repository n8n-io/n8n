import { DeepInfraLLM } from '@langchain/community/llms/deepinfra';
import type { LLMResult } from '@langchain/core/outputs';
import {
	NodeConnectionType,
	type INodePropertyOptions,
	type INodeProperties,
	type ISupplyDataFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

const modelField: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	options: [
		{
			name: 'Meta-Llama 3.3 70B Instruct',
			value: 'meta-llama/Llama-3.3-70B-Instruct',
		},
		// Add more models as needed
	],
	description: 'The model which will generate the completion',
	default: 'meta-llama/Llama-3.3-70B-Instruct',
};

export class LmChatDeepinfra implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Deepinfra Chat Model',
		name: 'lmChatDeepinfra',
		icon: 'file:deepinfra.svg',
		group: ['transform'],
		version: [1],
		defaultVersion: 1,
		description: 'Language Model Deepinfra',
		defaults: {
			name: 'Deepinfra Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatdeepinfra/',
					},
				],
			},
			alias: ['deepinfra', 'llama'],
		},
		inputs: [],
		outputs: [NodeConnectionType.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'deepinfraApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiChain]),
			{
				...modelField,
				displayOptions: {
					show: {
						'@version': [1],
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
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokensToSample',
						default: 20,
						description: 'The maximum number of tokens to generate in the completion',
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('deepinfraApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxTokensToSample?: number;
			temperature: number;
		};

		const model = new DeepInfraLLM({
			apiKey: credentials.apiKey as string,
			model: modelName,
			maxTokens: options.maxTokensToSample,
			temperature: options.temperature,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
