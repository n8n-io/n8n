import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { supplyModel } from '@n8n/ai-node-sdk';

type ModelOptions = {
	temperature?: number;
};

export class ExampleChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Example Chat Model',
		name: 'exampleChatModel',
		icon: { light: 'file:../../icons/example.svg', dark: 'file:../../icons/example.dark.svg' },
		group: ['transform'],
		version: [1],
		description: 'Chat model node for OpenAI API compatible providers',
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

		return supplyModel(this, {
			type: 'openai',
			baseUrl: credentials.url as string,
			apiKey: credentials.apiKey as string,
			model: modelName,
			temperature: options.temperature,
		});
	}
}
