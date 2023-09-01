/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';

import { Cohere } from 'langchain/llms/cohere';

export class LmCohere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cohere',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmCohere',
		icon: 'file:cohere.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Cohere',
		defaults: {
			name: 'Cohere',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['languageModel'],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'cohereApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Maximum Tokens',
				name: 'maxTokens',
				default: 20,
				typeOptions: { minValue: 0 },
				description: 'Maximum amount of tokens to use for the completion',
				type: 'number',
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const credentials = await this.getCredentials('cohereApi');

		const itemIndex = 0;

		const maxTokens = this.getNodeParameter('maxTokens', itemIndex) as number;

		const model = new Cohere({
			maxTokens,
			apiKey: credentials.apiKey as string,
		});

		return {
			response: model,
		};
	}
}
