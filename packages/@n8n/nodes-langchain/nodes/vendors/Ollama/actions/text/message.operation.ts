import type { Tool } from '@langchain/core/tools';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { getConnectedTools } from '@utils/helpers';

import type { OllamaChatResponse, OllamaMessage, OllamaTool } from '../../helpers';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC,
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: { values: [{ content: '', role: 'user' }] },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						description: 'The content of the message to be sent',
						default: '',
						placeholder: 'e.g. Hello, how can you help me?',
						typeOptions: {
							rows: 2,
						},
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						description: 'The role of this message in the conversation',
						options: [
							{
								name: 'User',
								value: 'user',
								description: 'Message from the user',
							},
							{
								name: 'Assistant',
								value: 'assistant',
								description: 'Response from the assistant (for conversation history)',
							},
						],
						default: 'user',
					},
				],
			},
		],
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
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const messages = this.getNodeParameter('messages.values', i, []) as OllamaMessage[];
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {}) as MessageOptions;
	const { tools, connectedTools } = await getTools.call(this);

	if (options.system) {
		messages.unshift({
			role: 'system',
			content: options.system,
		});
	}

	delete options.system;

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
		tools,
		options: processedOptions,
	};

	let response: OllamaChatResponse = await apiRequest.call(this, 'POST', '/api/chat', {
		body,
	});

	if (tools.length > 0 && response.message.tool_calls && response.message.tool_calls.length > 0) {
		const toolCalls = response.message.tool_calls;

		messages.push(response.message);

		for (const toolCall of toolCalls) {
			let toolResponse = '';
			let toolFound = false;

			for (const tool of connectedTools) {
				if (tool.name === toolCall.function.name) {
					toolFound = true;
					try {
						const result: unknown = await tool.invoke(toolCall.function.arguments);
						toolResponse =
							typeof result === 'object' && result !== null
								? JSON.stringify(result)
								: String(result);
					} catch (error) {
						toolResponse = `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
					}
					break;
				}
			}

			// Add tool response even if tool wasn't found to prevent silent failure
			if (!toolFound) {
				toolResponse = `Error: Tool '${toolCall.function.name}' not found`;
			}

			messages.push({
				role: 'tool',
				content: toolResponse,
				tool_name: toolCall.function.name,
			});
		}

		const updatedBody = {
			...body,
			messages,
		};

		response = await apiRequest.call(this, 'POST', '/api/chat', {
			body: updatedBody,
		});
	}

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

async function getTools(this: IExecuteFunctions) {
	let connectedTools: Tool[] = [];
	const nodeInputs = this.getNodeInputs();

	if (nodeInputs.some((input) => input.type === 'ai_tool')) {
		connectedTools = await getConnectedTools(this, true);
	}

	const tools: OllamaTool[] = connectedTools.map((tool) => ({
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: zodToJsonSchema(tool.schema),
		},
	}));

	return { tools, connectedTools };
}
