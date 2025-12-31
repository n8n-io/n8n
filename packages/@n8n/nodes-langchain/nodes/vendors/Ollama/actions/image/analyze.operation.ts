import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { OllamaChatResponse, OllamaMessage } from '../../helpers';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC,
	{
		displayName: 'Text Input',
		name: 'text',
		type: 'string',
		placeholder: "e.g. What's in this image?",
		default: "What's in this image?",
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		default: 'binary',
		options: [
			{
				name: 'Binary File(s)',
				value: 'binary',
			},
			{
				name: 'Image URL(s)',
				value: 'url',
			},
		],
	},
	{
		displayName: 'Input Data Field Name(s)',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description:
			'Name of the binary field(s) which contains the image(s), separate multiple field names with commas',
		displayOptions: {
			show: {
				inputType: ['binary'],
			},
		},
	},
	{
		displayName: 'URL(s)',
		name: 'imageUrls',
		type: 'string',
		placeholder: 'e.g. https://example.com/image.png',
		description: 'URL(s) of the image(s) to analyze, multiple URLs can be added separated by comma',
		default: '',
		displayOptions: {
			show: {
				inputType: ['url'],
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to simplify the response or not',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'System Message',
				name: 'system',
				type: 'string',
				default: '',
				placeholder: 'e.g. You are a helpful assistant.',
				description: 'System message to set the context for the conversation',
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.8,
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				description: 'Controls randomness in responses. Lower values make output more focused.',
			},
			{
				displayName: 'Output Randomness (Top P)',
				name: 'top_p',
				default: 0.7,
				description: 'The maximum cumulative probability of tokens to consider when sampling',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Top K',
				name: 'top_k',
				type: 'number',
				default: 40,
				typeOptions: {
					minValue: 1,
				},
				description: 'Controls diversity by limiting the number of top tokens to consider',
			},
			{
				displayName: 'Max Tokens',
				name: 'num_predict',
				type: 'number',
				default: 1024,
				typeOptions: {
					minValue: 1,
					numberPrecision: 0,
				},
				description: 'Maximum number of tokens to generate in the completion',
			},
			{
				displayName: 'Frequency Penalty',
				name: 'frequency_penalty',
				type: 'number',
				default: 0.0,
				typeOptions: {
					minValue: 0,
					numberPrecision: 2,
				},
				description:
					'Adjusts the penalty for tokens that have already appeared in the generated text. Higher values discourage repetition.',
			},
			{
				displayName: 'Presence Penalty',
				name: 'presence_penalty',
				type: 'number',
				default: 0.0,
				typeOptions: {
					numberPrecision: 2,
				},
				description:
					'Adjusts the penalty for tokens based on their presence in the generated text so far. Positive values penalize tokens that have already appeared, encouraging diversity.',
			},
			{
				displayName: 'Repetition Penalty',
				name: 'repeat_penalty',
				type: 'number',
				default: 1.1,
				typeOptions: {
					minValue: 0,
					numberPrecision: 2,
				},
				description:
					'Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient.',
			},
			{
				displayName: 'Context Length',
				name: 'num_ctx',
				type: 'number',
				default: 4096,
				typeOptions: {
					minValue: 1,
					numberPrecision: 0,
				},
				description: 'Sets the size of the context window used to generate the next token',
			},
			{
				displayName: 'Repeat Last N',
				name: 'repeat_last_n',
				type: 'number',
				default: 64,
				typeOptions: {
					minValue: -1,
					numberPrecision: 0,
				},
				description:
					'Sets how far back for the model to look back to prevent repetition. (0 = disabled, -1 = num_ctx).',
			},
			{
				displayName: 'Min P',
				name: 'min_p',
				type: 'number',
				default: 0.0,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 3,
				},
				description:
					'Alternative to the top_p, and aims to ensure a balance of quality and variety. The parameter p represents the minimum probability for a token to be considered, relative to the probability of the most likely token.',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				description:
					'Sets the random number seed to use for generation. Setting this to a specific number will make the model generate the same text for the same prompt.',
			},
			{
				displayName: 'Stop Sequences',
				name: 'stop',
				type: 'string',
				default: '',
				description:
					'Sets the stop sequences to use. When this pattern is encountered the LLM will stop generating text and return. Separate multiple patterns with commas',
			},
			{
				displayName: 'Keep Alive',
				name: 'keep_alive',
				type: 'string',
				default: '5m',
				description:
					'Specifies the duration to keep the loaded model in memory after use. Format: 1h30m (1 hour 30 minutes).',
			},
			{
				displayName: 'Low VRAM Mode',
				name: 'low_vram',
				type: 'boolean',
				default: false,
				description:
					'Whether to activate low VRAM mode, which reduces memory usage at the cost of slower generation speed. Useful for GPUs with limited memory.',
			},
			{
				displayName: 'Main GPU ID',
				name: 'main_gpu',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				description:
					'Specifies the ID of the GPU to use for the main computation. Only change this if you have multiple GPUs.',
			},
			{
				displayName: 'Context Batch Size',
				name: 'num_batch',
				type: 'number',
				default: 512,
				typeOptions: {
					minValue: 1,
					numberPrecision: 0,
				},
				description:
					'Sets the batch size for prompt processing. Larger batch sizes may improve generation speed but increase memory usage.',
			},
			{
				displayName: 'Number of GPUs',
				name: 'num_gpu',
				type: 'number',
				default: -1,
				typeOptions: {
					minValue: -1,
					numberPrecision: 0,
				},
				description:
					'Specifies the number of GPUs to use for parallel processing. Set to -1 for auto-detection.',
			},
			{
				displayName: 'Number of CPU Threads',
				name: 'num_thread',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				description:
					'Specifies the number of CPU threads to use for processing. Set to 0 for auto-detection.',
			},
			{
				displayName: 'Penalize Newlines',
				name: 'penalize_newline',
				type: 'boolean',
				default: true,
				description:
					'Whether the model will be less likely to generate newline characters, encouraging longer continuous sequences of text',
			},
			{
				displayName: 'Use Memory Locking',
				name: 'use_mlock',
				type: 'boolean',
				default: false,
				description:
					'Whether to lock the model in memory to prevent swapping. This can improve performance but requires sufficient available memory.',
			},
			{
				displayName: 'Use Memory Mapping',
				name: 'use_mmap',
				type: 'boolean',
				default: true,
				description:
					'Whether to use memory mapping for loading the model. This can reduce memory usage but may impact performance.',
			},
			{
				displayName: 'Load Vocabulary Only',
				name: 'vocab_only',
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
					{ name: 'Default', value: '' },
					{ name: 'JSON', value: 'json' },
				],
				default: '',
				description: 'Specifies the format of the API response',
			},
		],
	},
];

interface MessageOptions {
	system?: string;
	temperature?: number;
	top_p?: number;
	top_k?: number;
	num_predict?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	repeat_penalty?: number;
	num_ctx?: number;
	repeat_last_n?: number;
	min_p?: number;
	seed?: number;
	stop?: string | string[];
	low_vram?: boolean;
	main_gpu?: number;
	num_batch?: number;
	num_gpu?: number;
	num_thread?: number;
	penalize_newline?: boolean;
	use_mlock?: boolean;
	use_mmap?: boolean;
	vocab_only?: boolean;
	format?: string;
	keep_alive?: string;
}

const displayOptions = {
	show: {
		operation: ['analyze'],
		resource: ['image'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const inputType = this.getNodeParameter('inputType', i, 'binary') as string;
	const text = this.getNodeParameter('text', i, '') as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {}) as MessageOptions;

	let images: string[];

	if (inputType === 'url') {
		const urls = this.getNodeParameter('imageUrls', i, '') as string;
		const urlList = urls
			.split(',')
			.map((url) => url.trim())
			.filter((url) => url);

		// For URL inputs, we need to download and convert to base64
		const imagePromises = urlList.map(async (url) => {
			const response = (await this.helpers.httpRequest({
				method: 'GET',
				url,
				encoding: 'arraybuffer',
			})) as Buffer;
			return response.toString('base64');
		});

		images = await Promise.all(imagePromises);
	} else {
		const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', i, 'data');
		const propertyNames = binaryPropertyNames
			.split(',')
			.map((name: string) => name.trim())
			.filter((name: string) => name);

		const imagePromises = propertyNames.map(async (binaryPropertyName: string) => {
			const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
			return buffer.toString('base64');
		});

		images = await Promise.all(imagePromises);
	}

	const messages: OllamaMessage[] = [
		{
			role: 'user',
			content: text,
			images,
		},
	];

	const processedOptions = { ...options };
	if (processedOptions.stop && typeof processedOptions.stop === 'string') {
		processedOptions.stop = processedOptions.stop
			.split(',')
			.map((s: string) => s.trim())
			.filter(Boolean);
	}

	const body = {
		model,
		messages,
		stream: false,
		options: processedOptions,
	};

	const response: OllamaChatResponse = await apiRequest.call(this, 'POST', '/api/chat', {
		body,
	});

	if (simplify) {
		return [
			{
				json: { content: response.message.content },
				pairedItem: { item: i },
			},
		];
	}

	return [
		{
			json: { ...response },
			pairedItem: { item: i },
		},
	];
}
