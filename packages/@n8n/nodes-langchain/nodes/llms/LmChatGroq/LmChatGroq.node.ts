/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { ChatGroq } from '@langchain/groq';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class LmChatGroq implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Groq Chat Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmChatGroq',
		icon: 'file:groq.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Groq',
		defaults: {
			name: 'Groq Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatgroq/',
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
				name: 'groqApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.groq.com/openai/v1',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiChain]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/models',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'data',
										},
									},
									{
										type: 'filter',
										properties: {
											pass: '={{ $responseItem.active === true && $responseItem.object === "model" }}',
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.id}}',
											value: '={{$responseItem.id}}',
										},
									},
								],
							},
						},
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				description:
					'The model which will generate the completion. <a href="https://console.groq.com/docs/models">Learn more</a>.',
				default: 'llama3-8b-8192',
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
						default: 4096,
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

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('groqApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			maxTokensToSample?: number;
			temperature: number;
		};

		const model = new ChatGroq({
			apiKey: credentials.apiKey as string,
			modelName,
			maxTokens: options.maxTokensToSample,
			temperature: options.temperature,
		});

		return {
			response: logWrapper(model, this),
		};
	}
}
