/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';

import { HuggingFaceInference } from 'langchain/llms/hf';

export class LMOpenHuggingFaceInference implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - HuggingFaceInference',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmOpenHuggingFaceInference',
		icon: 'file:huggingface.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model HuggingFaceInference',
		defaults: {
			name: 'LangChain - HuggingFaceInference',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['languageModel'],
		outputNames: ['Language Model'],
		credentials: [
			{
				name: 'huggingFaceApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'GTP 2',
						value: 'gpt2',
					},
				],
				default: 'gpt2',
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
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const credentials = await this.getCredentials('huggingFaceApi');

		const itemIndex = 0;

		// TODO: Should it get executed once per item or not?
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const temperature = this.getNodeParameter('temperature', itemIndex) as number;

		const model = new HuggingFaceInference({
			model: modelName,
			apiKey: credentials.apiKey as string,
			temperature,
			maxTokens: 100,
		});

		return {
			response: model,
		};
	}
}
