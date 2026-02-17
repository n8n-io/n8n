import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { supplyModel } from '@n8n/ai-node-sdk';
import Stream from 'node:stream';
import { CustomChatModel } from './model';

type ModelOptions = {
	temperature?: number;
};

// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool
export class ExampleChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Example Chat Model',
		name: 'exampleChatModel',
		icon: { light: 'file:example.svg', dark: 'file:example.dark.svg' },
		group: ['transform'],
		version: [1],
		description: 'Custom Chat Model Node',
		defaults: {
			name: 'Example Chat Model',
		},
		codex: {
			categories: ['assistant'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'exampleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: '',
				description: 'The model which will generate the completion',
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
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials('exampleApi');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;

		const model = new CustomChatModel(
			modelName,
			{
				httpRequest: async () => {
					// make a request to the API using this.helpers.httpRequestWithAuthentication.call
					return {
						body: {
							response: 'Hello World!',
							tokenUsage: {
								promptTokens: 10,
								completionTokens: 10,
								totalTokens: 20,
							},
						},
					};
				},
				openStream: async () => {
					// make a request to the API using this.helpers.httpRequestWithAuthentication.call
					const mockStream = new Stream.Readable();
					mockStream.push('Hello');
					mockStream.push('World');
					mockStream.push('!');
					mockStream.push(null);
					return {
						body: mockStream,
					};
				},
			},
			{
				url: credentials.url as string,
				temperature: options.temperature,
			},
		);

		return supplyModel(this, model);
	}
}
