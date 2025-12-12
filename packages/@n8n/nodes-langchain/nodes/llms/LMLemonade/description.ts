import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

export const lemonadeDescription: Partial<INodeTypeDescription> = {
	credentials: [
		{
			name: 'lemonadeApi',
			required: true,
		},
	],
	requestDefaults: {
		ignoreHttpStatusErrors: true,
		baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
	},
};

export const lemonadeModel: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	default: '',
	description:
		'The model which will generate the completion. Models are loaded and managed through the Lemonade server.',
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
							type: 'setKeyValue',
							properties: {
								name: '={{$responseItem.id}}',
								value: '={{$responseItem.id}}',
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

export const lemonadeOptions: INodeProperties = {
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
				'Controls the randomness of the generated text. Lower values make the output more focused and deterministic, while higher values make it more diverse and random.',
			type: 'number',
		},
		{
			displayName: 'Top P',
			name: 'topP',
			default: 1,
			typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
			description:
				'Chooses from the smallest possible set of tokens whose cumulative probability exceeds the probability top_p. Helps generate more human-like text by reducing repetitions.',
			type: 'number',
		},
		{
			displayName: 'Frequency Penalty',
			name: 'frequencyPenalty',
			type: 'number',
			default: 0.0,
			typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 1 },
			description:
				'Adjusts the penalty for tokens that have already appeared in the generated text. Positive values discourage repetition, negative values encourage it.',
		},
		{
			displayName: 'Presence Penalty',
			name: 'presencePenalty',
			type: 'number',
			default: 0.0,
			typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 1 },
			description:
				'Adjusts the penalty for tokens based on their presence in the generated text so far. Positive values penalize tokens that have already appeared, encouraging diversity.',
		},
		{
			displayName: 'Max Tokens to Generate',
			name: 'maxTokens',
			type: 'number',
			default: -1,
			description:
				'The maximum number of tokens to generate. Set to -1 for no limit. Be cautious when setting this to a large value, as it can lead to very long outputs.',
		},
		{
			displayName: 'Stop Sequences',
			name: 'stop',
			type: 'string',
			default: '',
			description: 'Comma-separated list of sequences where the model will stop generating text',
		},
	],
};
