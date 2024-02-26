import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

export const ollamaDescription: Partial<INodeTypeDescription> = {
	credentials: [
		{
			name: 'ollamaApi',
			required: true,
		},
	],
	requestDefaults: {
		ignoreHttpStatusErrors: true,
		baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
	},
};

export const ollamaModel: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	default: 'llama2',
	description:
		'The model which will generate the completion. To download models, visit <a href="https://ollama.ai/library">Ollama Models Library</a>.',
	typeOptions: {
		loadOptions: {
			routing: {
				request: {
					method: 'GET',
					url: '/api/tags',
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
	routing: {
		send: {
			type: 'body',
			property: 'model',
		},
	},
	required: true,
};

export const ollamaOptions: INodeProperties = {
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
			typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
			description:
				'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
			type: 'number',
		},
		{
			displayName: 'Top K',
			name: 'topK',
			default: -1,
			typeOptions: { maxValue: 1, minValue: -1, numberPrecision: 1 },
			description:
				'Used to remove "long tail" low probability responses. Defaults to -1, which disables it.',
			type: 'number',
		},
		{
			displayName: 'Top P',
			name: 'topP',
			default: 1,
			typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
			description:
				'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
			type: 'number',
		},
	],
};
