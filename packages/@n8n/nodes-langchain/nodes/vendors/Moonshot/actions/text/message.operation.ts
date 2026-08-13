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
	BuiltinTool,
	ChatCompletionResponse,
	ChatMessage,
	ContentBlock,
	ToolCall,
	ToolFunction,
} from '../../helpers/interfaces';
import { prepareBinaryPropertyList } from '../../helpers/utils';
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
		displayName: 'Add Attachments',
		name: 'addAttachments',
		type: 'boolean',
		default: false,
		description: 'Whether to add image attachments to the message',
	},
	{
		displayName: 'Attachment Input Data Field Name(s)',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		description:
			'Name of the binary field(s) which contains the image(s) to attach, separate multiple field names with commas',
		typeOptions: {
			binaryDataProperty: true,
		},
		displayOptions: {
			show: {
				addAttachments: [true],
			},
		},
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
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
				type: 'number',
			},
			{
				displayName: 'Include Merged Response',
				name: 'includeMergedResponse',
				type: 'boolean',
				default: false,
				description:
					'Whether to include a single output string merging all text parts of the response',
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
				default: 1,
				description: 'The maximum cumulative probability of tokens to consider when sampling',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
				type: 'number',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				default: 'text',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Regular text response',
					},
					{
						name: 'JSON',
						value: 'json_object',
						description:
							'Enables JSON mode, which should guarantee the message the model generates is valid JSON',
					},
				],
			},
			{
				displayName: 'System Message',
				name: 'system',
				type: 'string',
				default: '',
				placeholder: 'e.g. You are a helpful assistant',
			},
			{
				displayName: 'Thinking Mode',
				name: 'thinkingMode',
				type: 'boolean',
				default: false,
				description:
					'Whether to enable thinking mode for deep reasoning. The model will include reasoning steps in the response. Cannot be used together with Web Search.',
			},
			{
				displayName: 'Web Search',
				name: 'webSearch',
				type: 'boolean',
				default: false,
				description:
					'Whether to enable built-in web search. The model will search the web for relevant information. Cannot be used together with Thinking Mode.',
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
	includeMergedResponse?: boolean;
	maxTokens?: number;
	system?: string;
	temperature?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	responseFormat?: string;
	thinkingMode?: boolean;
	webSearch?: boolean;
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true }) as string;
	const rawMessages = this.getNodeParameter('messages.values', i, []) as Array<{
		content: string;
		role: string;
	}>;
	const addAttachments = this.getNodeParameter('addAttachments', i, false) as boolean;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const options = this.getNodeParameter('options', i, {}) as MessageOptions;

	const messages: ChatMessage[] = [];

	if (options.system) {
		messages.push({ role: 'system', content: options.system });
	}

	for (const msg of rawMessages) {
		messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
	}

	if (addAttachments) {
		await addAttachmentsToMessages.call(this, i, messages);
	}

	const { tools, connectedTools } = await getToolDefinitions.call(this, options);

	const body: IDataObject = {
		model,
		messages,
		max_tokens: options.maxTokens ?? 1024,
	};

	if (options.temperature !== undefined) body.temperature = options.temperature;
	if (options.topP !== undefined) body.top_p = options.topP;
	if (options.frequencyPenalty !== undefined) body.frequency_penalty = options.frequencyPenalty;
	if (options.presencePenalty !== undefined) body.presence_penalty = options.presencePenalty;

	if (tools.length > 0) {
		body.tools = tools;
	}

	if (options.responseFormat && options.responseFormat !== 'text') {
		body.response_format = { type: options.responseFormat };
	}

	if (options.thinkingMode && !options.webSearch) {
		body.thinking = { type: 'enabled' };
	} else {
		body.thinking = { type: 'disabled' };
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
	const mergedResponse = options.includeMergedResponse ? (finalMessage?.content ?? '') : undefined;

	if (simplify) {
		const result: IDataObject = {
			content: finalMessage?.content ?? '',
		};

		if (options.thinkingMode && finalMessage?.reasoning_content) {
			result.reasoning_content = finalMessage.reasoning_content;
		}

		if (mergedResponse !== undefined) {
			result.merged_response = mergedResponse;
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
			json: { ...response, merged_response: mergedResponse },
			pairedItem: { item: i },
		},
	];
}

async function getToolDefinitions(this: IExecuteFunctions, options: MessageOptions) {
	let connectedTools: Tool[] = [];
	const nodeInputs = this.getNodeInputs();

	if (nodeInputs.some((input) => input.type === 'ai_tool')) {
		connectedTools = await getConnectedTools(this, true);
	}

	const tools: Array<ToolFunction | BuiltinTool> = connectedTools.map((t) => ({
		type: 'function' as const,
		function: {
			name: t.name,
			description: t.description,
			parameters: zodToJsonSchema(t.schema) as IDataObject,
		},
	}));

	if (options.webSearch) {
		tools.push({
			type: 'builtin_function',
			function: { name: '$web_search' },
		});
	}

	return { tools, connectedTools };
}

async function addAttachmentsToMessages(
	this: IExecuteFunctions,
	i: number,
	messages: ChatMessage[],
) {
	const binaryPropertyNames = this.getNodeParameter('binaryPropertyName', i, 'data');

	const content: ContentBlock[] = [];
	for (const binaryPropertyName of prepareBinaryPropertyList(binaryPropertyNames)) {
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		const base64 = buffer.toString('base64');
		const dataUrl = `data:${binaryData.mimeType};base64,${base64}`;
		content.push({ type: 'image_url', image_url: { url: dataUrl } });
	}

	if (content.length === 0) {
		return;
	}

	const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
	if (lastUserMessage && typeof lastUserMessage.content === 'string') {
		content.push({ type: 'text', text: lastUserMessage.content });
		lastUserMessage.content = content;
	} else {
		messages.push({ role: 'user', content });
	}
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
