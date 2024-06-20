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
				'Controls the randomness of the generated text. Lower values make the output more focused and deterministic, while higher values make it more diverse and random.',
			type: 'number',
		},
		{
			displayName: 'Top K',
			name: 'topK',
			default: -1,
			typeOptions: { maxValue: 100, minValue: -1, numberPrecision: 1 },
			description:
				'Limits the number of highest probability vocabulary tokens to consider at each step. A higher value increases diversity but may reduce coherence. Set to -1 to disable.',
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
			typeOptions: { minValue: 0 },
			description:
				'Adjusts the penalty for tokens that have already appeared in the generated text. Higher values discourage repetition.',
		},
		{
			displayName: 'Keep Alive',
			name: 'keepAlive',
			type: 'string',
			default: '5m',
			description:
				'Specifies the duration to keep the loaded model in memory after use. Useful for frequently used models. Format: 1h30m (1 hour 30 minutes).',
		},
		{
			displayName: 'Low VRAM Mode',
			name: 'lowVram',
			type: 'boolean',
			default: false,
			description:
				'Whether to Activate low VRAM mode, which reduces memory usage at the cost of slower generation speed. Useful for GPUs with limited memory.',
		},
		{
			displayName: 'Main GPU ID',
			name: 'mainGpu',
			type: 'number',
			default: 0,
			description:
				'Specifies the ID of the GPU to use for the main computation. Only change this if you have multiple GPUs.',
		},
		{
			displayName: 'Context Batch Size',
			name: 'numBatch',
			type: 'number',
			default: 512,
			description:
				'Sets the batch size for prompt processing. Larger batch sizes may improve generation speed but increase memory usage.',
		},
		{
			displayName: 'Context Length',
			name: 'numCtx',
			type: 'number',
			default: 2048,
			description:
				'The maximum number of tokens to use as context for generating the next token. Smaller values reduce memory usage, while larger values provide more context to the model.',
		},
		{
			displayName: 'Number of GPUs',
			name: 'numGpu',
			type: 'number',
			default: -1,
			description:
				'Specifies the number of GPUs to use for parallel processing. Set to -1 for auto-detection.',
		},
		{
			displayName: 'Max Tokens to Generate',
			name: 'numPredict',
			type: 'number',
			default: -1,
			description:
				'The maximum number of tokens to generate. Set to -1 for no limit. Be cautious when setting this to a large value, as it can lead to very long outputs.',
		},
		{
			displayName: 'Number of CPU Threads',
			name: 'numThread',
			type: 'number',
			default: 0,
			description:
				'Specifies the number of CPU threads to use for processing. Set to 0 for auto-detection.',
		},
		{
			displayName: 'Penalize Newlines',
			name: 'penalizeNewline',
			type: 'boolean',
			default: true,
			description:
				'Whether the model will be less likely to generate newline characters, encouraging longer continuous sequences of text',
		},
		{
			displayName: 'Presence Penalty',
			name: 'presencePenalty',
			type: 'number',
			default: 0.0,
			description:
				'Adjusts the penalty for tokens based on their presence in the generated text so far. Positive values penalize tokens that have already appeared, encouraging diversity.',
		},
		{
			displayName: 'Repetition Penalty',
			name: 'repeatPenalty',
			type: 'number',
			default: 1.0,
			description:
				'Adjusts the penalty factor for repeated tokens. Higher values more strongly discourage repetition. Set to 1.0 to disable repetition penalty.',
		},
		{
			displayName: 'Use Memory Locking',
			name: 'useMLock',
			type: 'boolean',
			default: false,
			description:
				'Whether to lock the model in memory to prevent swapping. This can improve performance but requires sufficient available memory.',
		},
		{
			displayName: 'Use Memory Mapping',
			name: 'useMMap',
			type: 'boolean',
			default: true,
			description:
				'Whether to use memory mapping for loading the model. This can reduce memory usage but may impact performance. Recommended to keep enabled.',
		},
		{
			displayName: 'Load Vocabulary Only',
			name: 'vocabOnly',
			type: 'boolean',
			default: false,
			description:
				'Whether to only load the model vocabulary without the weights. Useful for quickly testing tokenization.',
		},
		{
			displayName: 'Output Format',
			name: 'format',
			type: 'options',
			options: [
				{ name: 'Default', value: 'default' },
				{ name: 'JSON', value: 'json' },
			],
			default: 'default',
			description: 'Specifies the format of the API response',
		},
	],
};
