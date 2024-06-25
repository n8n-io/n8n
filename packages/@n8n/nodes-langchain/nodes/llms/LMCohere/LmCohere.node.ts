/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { Cohere } from '@langchain/cohere';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmCohere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cohere Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmCohere',
		icon: 'file:cohere.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Cohere',
		defaults: {
			name: 'Cohere Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmcohere/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'cohereApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiAgent]),
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
						default: 250,
						description:
							'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
						type: 'number',
						typeOptions: {
							maxValue: 32768,
						},
					},
					{
						displayName: 'Model',
						name: 'model',
						type: 'string',
						description: 'The name of the model to use',
						default: '',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('cohereApi');

		const options = this.getNodeParameter('options', itemIndex, {}) as object;

		const model = new Cohere({
			apiKey: credentials.apiKey as string,
			...options,
			callbacks: [new N8nLlmTracing(this)],
		});

		return {
			response: model,
		};
	}
}
