import type { Tool } from '@langchain/core/tools';
import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { accumulateTokenUsage, NodeOperationError, updateDisplayOptions } from 'n8n-workflow';
import zodToJsonSchema from 'zod-to-json-schema';

import { getConnectedTools } from '@utils/helpers';

import type { IMessage, IModelStudioRequestBody } from '../../helpers/interfaces';
import { fetchModelCatalog, toModalitySet } from '../../helpers/modelCatalog';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	{
		...modelRLC('textModelSearch'),
		displayOptions: {
			show: { '@version': [{ _cnd: { gte: 1.1 } }] },
		},
	},
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {
			messageValues: [
				{
					content: '',
					role: 'user',
				},
			],
		},
		placeholder: 'Add Message',
		options: [
			{
				name: 'messageValues',
				displayName: 'Message',
				values: [
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'The content of the message',
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{
								name: 'User',
								value: 'user',
							},
							{
								name: 'Assistant',
								value: 'assistant',
							},
						],
						default: 'user',
						description: 'The role of the message sender',
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
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Enable Search',
				name: 'enableSearch',
				type: 'boolean',
				default: false,
				description: 'Whether to enable web search for up-to-date information',
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 2000,
				description: 'Maximum number of tokens to generate',
			},
			{
				displayName: 'Max Tools Iterations',
				name: 'maxToolsIterations',
				type: 'number',
				default: 15,
				description:
					'Maximum number of tool-calling iterations before stopping. Set to 0 for unlimited.',
			},
			{
				displayName: 'Repetition Penalty',
				name: 'repetitionPenalty',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 2,
					numberPrecision: 2,
				},
				default: 1.1,
				description: 'Penalty for token repetition. Higher values reduce repetition.',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: 1234,
				description: 'Random seed for reproducible outputs',
			},
			{
				displayName: 'Stop Sequences',
				name: 'stop',
				type: 'string',
				default: '',
				description: 'Comma-separated list of sequences where the API will stop generating',
			},
			{
				displayName: 'System Message',
				name: 'system',
				type: 'string',
				default: '',
				placeholder: 'e.g. You are a helpful assistant',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				default: 1,
				description:
					'Controls randomness in the output. Lower values make output more focused and deterministic.',
			},
			{
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 50,
				description: 'Limits the sampling pool to top K tokens',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				default: 0.9,
				description: 'Nucleus sampling parameter. Lower values make output more focused.',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

const TEXT_ONLY_PATTERNS = ['coder', 'math'];

// Picks the DashScope endpoint from the model's actual input modalities: a model
// that accepts non-text input (image/audio/video) needs the multimodal-generation
// endpoint, otherwise text-generation. Falls back to a name-based heuristic when
// the model is not in the catalogue (e.g. a manually typed id or fetch failure).
async function isMultimodalModel(this: IExecuteFunctions, model: string): Promise<boolean> {
	try {
		const catalog = await fetchModelCatalog.call(this);
		const entry = catalog.find((m) => m.model === model);
		if (entry?.inference_metadata) {
			const input = toModalitySet(entry.inference_metadata.request_modality);
			return [...input].some((modality) => modality !== 'text');
		}
	} catch {
		// Catalogue unavailable — fall back to the name-based heuristic below.
	}

	const lower = model.toLowerCase();
	return !TEXT_ONLY_PATTERNS.some((pattern) => lower.includes(pattern));
}

interface DashScopeToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const nodeVersion = this.getNode().typeVersion;
	const model =
		nodeVersion >= 1.1
			? (this.getNodeParameter('modelId', itemIndex, '', { extractValue: true }) as string)
			: (this.getNodeParameter('modelId', itemIndex) as string);
	const messagesParam = this.getNodeParameter('messages', itemIndex) as {
		messageValues: IMessage[];
	};
	const messages = messagesParam.messageValues || [];
	const options = this.getNodeParameter('options', itemIndex, {});
	const simplify = this.getNodeParameter('simplify', itemIndex, true) as boolean;

	const isMultimodal = await isMultimodalModel.call(this, model);

	const { tools, connectedTools } = await getTools.call(this);

	// For multimodal models, convert plain-text message content to the array format
	// expected by the multimodal-generation endpoint: [{ text: "..." }]
	const formattedMessages: IMessage[] = isMultimodal
		? messages.map((msg) => ({
				role: msg.role,
				content: typeof msg.content === 'string' ? [{ text: msg.content }] : msg.content,
			}))
		: messages;

	if (options.system) {
		formattedMessages.unshift({
			role: 'system',
			content: isMultimodal ? [{ text: options.system as string }] : (options.system as string),
		});
	}

	const body: IModelStudioRequestBody = {
		model,
		input: {
			messages: formattedMessages,
		},
		parameters: {},
	};

	if (options.temperature !== undefined) {
		body.parameters.temperature = options.temperature as number;
	}
	if (options.topP !== undefined) {
		body.parameters.top_p = options.topP as number;
	}
	if (options.topK !== undefined) {
		body.parameters.top_k = options.topK as number;
	}
	if (options.maxTokens !== undefined) {
		body.parameters.max_tokens = options.maxTokens as number;
	}
	if (options.repetitionPenalty !== undefined) {
		body.parameters.repetition_penalty = options.repetitionPenalty as number;
	}
	if (options.stop) {
		body.parameters.stop = (options.stop as string).split(',').map((s: string) => s.trim());
	}
	if (options.enableSearch !== undefined) {
		body.parameters.enable_search = options.enableSearch as boolean;
	}
	if (options.seed !== undefined) {
		body.parameters.seed = options.seed as number;
	}
	if (tools.length) {
		body.parameters.tools = tools;
	}

	const endpoint = isMultimodal
		? '/api/v1/services/aigc/multimodal-generation/generation'
		: '/api/v1/services/aigc/text-generation/generation';

	let response = await apiRequest.call(this, 'POST', endpoint, { body });

	const captureUsage = () => {
		const usage = response?.usage as { input_tokens: number; output_tokens: number } | undefined;
		if (usage) {
			accumulateTokenUsage(this, usage.input_tokens, usage.output_tokens);
		}
	};

	captureUsage();

	const maxToolsIterations = this.getNodeParameter(
		'options.maxToolsIterations',
		itemIndex,
		15,
	) as number;
	const abortSignal = this.getExecutionCancelSignal();
	let currentIteration = 0;

	while (true) {
		if (abortSignal?.aborted) {
			break;
		}

		const choice = response.output?.choices?.[0];
		const finishReason = choice?.finish_reason as string | undefined;

		if (finishReason === 'tool_calls') {
			if (maxToolsIterations > 0 && currentIteration >= maxToolsIterations) {
				break;
			}

			const assistantMessage = choice.message;
			formattedMessages.push(assistantMessage);
			await handleToolUse.call(
				this,
				assistantMessage.tool_calls,
				formattedMessages,
				connectedTools,
			);
			currentIteration++;
		} else {
			break;
		}

		response = await apiRequest.call(this, 'POST', endpoint, { body });
		captureUsage();
	}

	const output = isMultimodal
		? (response.output?.choices?.[0]?.message?.content?.[0]?.text as string) || ''
		: response.output?.text || response.output?.choices?.[0]?.message?.content || '';

	return {
		json: simplify
			? { content: output }
			: {
					content: output,
					model,
					usage: response.usage,
					fullResponse: response,
				},
		pairedItem: itemIndex,
	};
}

async function getTools(this: IExecuteFunctions) {
	let connectedTools: Tool[] = [];
	const nodeInputs = this.getNodeInputs();
	if (nodeInputs.some((i) => i.type === 'ai_tool')) {
		connectedTools = await getConnectedTools(this, true);
	}

	const tools = connectedTools.map((t) => ({
		type: 'function' as const,
		function: {
			name: t.name,
			description: t.description,
			parameters: zodToJsonSchema(t.schema),
		},
	}));

	return { tools, connectedTools };
}

async function handleToolUse(
	this: IExecuteFunctions,
	toolCalls: DashScopeToolCall[],
	messages: IMessage[],
	connectedTools: Tool[],
) {
	if (!toolCalls?.length) {
		return;
	}

	for (const toolCall of toolCalls) {
		const toolName = toolCall.function.name;
		let toolInput: unknown;
		try {
			toolInput = JSON.parse(toolCall.function.arguments);
		} catch {
			toolInput = toolCall.function.arguments;
		}

		let toolResponse: unknown;
		for (const connectedTool of connectedTools) {
			if (connectedTool.name === toolName) {
				toolResponse = await connectedTool.invoke(toolInput);
			}
		}

		if (toolResponse === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				`Tool "${toolName}" was called but not found among connected tools`,
			);
		}

		messages.push({
			role: 'tool',
			content:
				typeof toolResponse === 'object'
					? JSON.stringify(toolResponse)
					: String(toolResponse ?? ''),
			name: toolName,
		});
	}
}
