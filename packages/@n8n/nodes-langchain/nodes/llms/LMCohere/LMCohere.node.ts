/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';

import { Cohere } from 'langchain/llms/cohere';

export class LMCohere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Cohere',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmCohere',
		icon: 'file:cohere.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Cohere',
		defaults: {
			name: 'LangChain - Cohere',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['languageModel'],
		outputNames: ['Language Model'],
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
