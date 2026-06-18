import type { Tool } from '@langchain/core/tools';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { accumulateTokenUsage, jsonParse, updateDisplayOptions } from 'n8n-workflow';
import zodToJsonSchema from 'zod-to-json-schema';

import { getConnectedTools } from '@utils/helpers';

import type {
	ChatCompletionResponse,
	ChatMessage,
	ToolCall,
	ToolFunction,
} from '../../helpers/interfaces';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'options',
		options: [
			{ name: 'MiniMax-M2', value: 'MiniMax-M2' },
			{ name: 'MiniMax-M2.1', value: 'MiniMax-M2.1' },
			{ name: 'MiniMax-M2.1-Highspeed', value: 'MiniMax-M2.1-highspeed' },
			{ name: 'MiniMax-M2.5', value: 'MiniMax-M2.5' },
			{ name: 'MiniMax-M2.5-Highspeed', value: 'MiniMax-M2.5-highspeed' },
			{ name: 'MiniMax-M2.7', value: 'MiniMax-M2.7' },
			{ name: 'MiniMax-M2.7-Highspeed', value: 'MiniMax-M2.7-highspeed' },
		],
		default: 'MiniMax-M2.7',
		description: 'The model to use for generating the response',
	},
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
						displayName: 'Prompt',
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
						description:
							"Role in shaping the model's response, it tells the model how it should behave and interact with the user",
						options: [
							{
								name: 'User',
								value: 'user',
								description: 'Send a message as a user and get a response from the model',
							},
							{
								name: 'Assistant',
								value: 'assistant',
								description: 'Tell the model to adopt a specific tone or personality',
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
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Hide Thinking',
				name: 'hideThinking',
				type: 'boolean',
				default: true,
				description:
					'Whether to strip chain-of-thought reasoning from the response, returning only the final answer',
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				default: 1024,
				description: 'The maximum number of tokens to generate in the completion',
				type: 'number',
				typeOptions: {
					minValue: 1,
					numberPrecision: 0,
				},
			},
			{
				displayName: 'Max Tool Calls Iterations',
				name: 'maxToolsIterations',
				type: 'number',
				default: 15,
				description:
					'The maximum number of tool iteration cycles the LLM will run before stopping. A single iteration can contain multiple tool calls. Set to 0 for no limit.',
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
			},
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				default: 0.7,
				description:
					'Controls the randomness of the output. Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Output Randomness (Top P)',
				name: 'topP',
				default: 0.95,
				description: 'The maximum cumulative probability of tokens to consider when sampling',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
			},
			{
				displayName: 'System Message',
				name: 'system',
				type: 'string',
				default: '',
				placeholder: 'e.g. You are a helpful assistant',
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

interface MessageOptions {
	hideThinking?: boolean;
	maxTokens?: number;
	system?: string;
	temperature?: number;
	topP?: number;
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i) as string;
	const rawMessages = this.getNodeParameter('messages.values', i, []) as Array<{
		content: string;
		role: string;
	}>;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {}) as MessageOptions;

	const hideThinking = options.hideThinking ?? true;

	const messages: ChatMessage[] = [];

	if (options.system) {
		messages.push({ role: 'system', content: options.system });
	}

	for (const msg of rawMessages) {
		messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
	}

	const { tools, connectedTools } = await getToolDefinitions.call(this);

	const body: IDataObject = {
		model,
		messages,
		max_tokens: options.maxTokens ?? 1024,
	};

	if (hideThinking) {
		body.reasoning_split = true;
	}

	if (options.temperature !== undefined) body.temperature = options.temperature;
	if (options.topP !== undefined) body.top_p = options.topP;

	if (tools.length > 0) {
		body.tools = tools;
	}

	let response = (await apiRequest.call(this, 'POST', '/chat/completions', {
		body,
	})) as ChatCompletionResponse;

	const captureUsage = () => {
		const usage = response.usage;
		if (usage) {
			accumulateTokenUsage(this, usage.prompt_tokens, usage.completion_tokens);
		}
	};

	captureUsage();

	const maxToolsIterations = this.getNodeParameter('options.maxToolsIterations', i, 15) as number;
	const abortSignal = this.getExecutionCancelSignal();
	let currentIteration = 0;

	while (true) {
		if (abortSignal?.aborted) {
			break;
		}

		const choice = response.choices?.[0];
		if (choice?.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) {
			break;
		}

		if (maxToolsIterations > 0 && currentIteration >= maxToolsIterations) {
			break;
		}

		const assistantMsg: ChatMessage = {
			role: 'assistant',
			content: choice.message.content ?? '',
			tool_calls: choice.message.tool_calls,
		};
		if (choice.message.reasoning_content) {
			assistantMsg.reasoning_content = choice.message.reasoning_content;
		}
		messages.push(assistantMsg);

		await handleToolUse.call(this, choice.message.tool_calls, messages, connectedTools);
		currentIteration++;

		response = (await apiRequest.call(this, 'POST', '/chat/completions', {
			body,
		})) as ChatCompletionResponse;

		captureUsage();
	}

	const finalMessage = response.choices?.[0]?.message;

	if (simplify) {
		const result: IDataObject = {
			content: finalMessage?.content ?? '',
		};

		if (!hideThinking && finalMessage?.reasoning_content) {
			result.reasoning_content = finalMessage.reasoning_content;
		}

		return [
			{
				json: result,
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

async function getToolDefinitions(this: IExecuteFunctions) {
	let connectedTools: Tool[] = [];
	const nodeInputs = this.getNodeInputs();

	if (nodeInputs.some((input) => input.type === 'ai_tool')) {
		connectedTools = await getConnectedTools(this, true);
	}

	const tools: ToolFunction[] = connectedTools.map((t) => ({
		type: 'function' as const,
		function: {
			name: t.name,
			description: t.description,
			parameters: zodToJsonSchema(t.schema) as IDataObject,
		},
	}));

	return { tools, connectedTools };
}

async function handleToolUse(
	this: IExecuteFunctions,
	toolCalls: ToolCall[],
	messages: ChatMessage[],
	connectedTools: Tool[],
) {
	for (const toolCall of toolCalls) {
		let toolResponse: unknown;
		for (const connectedTool of connectedTools) {
			if (connectedTool.name === toolCall.function.name) {
				const args = jsonParse<IDataObject>(toolCall.function.arguments);
				toolResponse = await connectedTool.invoke(args);
			}
		}

		messages.push({
			role: 'tool',
			content:
				typeof toolResponse === 'object'
					? JSON.stringify(toolResponse)
					: ((toolResponse as string) ?? ''),
			tool_call_id: toolCall.id,
		});
	}
}
