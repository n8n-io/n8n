import type { JSONSchema7 } from 'json-schema';
import { randomUUID } from 'node:crypto';
import type { IHttpRequestMethods } from 'n8n-workflow';

import {
	BaseChatModel,
	getParametersJsonSchema,
	parseSSEStream,
	type FinishReason,
	type TokenUsage,
	type Tool,
	type ToolCall,
	type ChatModelConfig,
	type GenerateResult,
	type Message,
	type MessageContent,
	type ProviderTool,
	type StreamChunk,
} from 'src';

// Types
type OpenAITool =
	| {
			type: 'function';
			name: string;
			description?: string;
			parameters: JSONSchema7;
			strict?: boolean;
	  }
	| {
			type: 'web_search';
	  };

type OpenAIToolChoice = 'auto' | 'required' | 'none' | { type: 'function'; name: string };

type ResponsesInputItem =
	| { role: 'user'; content: string }
	| { role: 'user'; content: Array<{ type: 'input_text'; text: string }> }
	| {
			type: 'message';
			role: 'assistant';
			content: Array<{ type: 'output_text'; text: string }>;
	  }
	| {
			type: 'function_call';
			call_id: string;
			name: string;
			arguments: string;
	  }
	| { type: 'function_call_output'; call_id: string; output: string };

interface OpenAIResponsesRequest {
	model: string;
	input: string | ResponsesInputItem[];
	instructions?: string;
	max_output_tokens?: number;
	temperature?: number;
	top_p?: number;
	presence_penalty?: number;
	frequency_penalty?: number;
	tools?: OpenAITool[];
	tool_choice?: OpenAIToolChoice;
	parallel_tool_calls?: boolean;
	store?: boolean;
	stream?: boolean;
	metadata?: Record<string, unknown>;
}

type OpenAIResponseStatus =
	| 'completed'
	| 'failed'
	| 'in_progress'
	| 'cancelled'
	| 'queued'
	| 'incomplete';

interface OpenAIResponsesResponse {
	id: string;
	object: string;
	created_at: string;
	model: string;
	output: ResponsesOutputItem[];
	status: OpenAIResponseStatus;
	usage?: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
		input_tokens_details?: {
			cached_tokens?: number;
		};
		output_tokens_details?: {
			reasoning_tokens?: number;
		};
	};
	incomplete_details?: { reason?: 'max_output_tokens' | 'content_filter' } | null;
	error?: { code?: string; message?: string } | null;
	metadata?: Record<string, unknown>;
	user?: string;
	service_tier?: string;
}

type ResponsesOutputItem =
	| {
			type: 'message';
			role: 'assistant';
			id?: string;
			content: Array<{
				type: 'output_text';
				text: string;
			}>;
	  }
	| {
			type: 'function_call';
			id?: string;
			call_id?: string;
			name: string;
			arguments: string;
	  }
	| {
			type: 'reasoning';
			id?: string;
			summary: Array<{
				type: string;
				text: string;
			}>;
	  };

interface OpenAIStreamEvent {
	type: string;
	delta?: string;
	output_index?: number;
	item?: Record<string, unknown>;
	response?: Partial<OpenAIResponsesResponse>;
	usage?: OpenAIResponsesResponse['usage'];
	message?: string;
}

// Helpers

async function* parseOpenAIStreamEvents(
	body: AsyncIterableIterator<Buffer | Uint8Array>,
): AsyncIterable<OpenAIStreamEvent> {
	for await (const message of parseSSEStream(body)) {
		if (!message.data) continue;
		if (message.data === '[DONE]') continue;

		try {
			const event = JSON.parse(message.data);
			yield event as OpenAIStreamEvent;
		} catch (e) {
			if (process.env.NODE_ENV !== 'production') {
				console.warn('Failed to parse OpenAI SSE event:', message.data);
			}
		}
	}
}

function genericMessagesToResponsesInput(messages: Message[]): {
	instructions?: string;
	input: string | ResponsesInputItem[];
} {
	const instructionsParts: string[] = [];
	const inputItems: ResponsesInputItem[] = [];

	for (const msg of messages) {
		if (msg.role === 'system') {
			for (const contentPart of msg.content) {
				if (contentPart.type === 'text') {
					instructionsParts.push(contentPart.text);
				}
			}
		}

		if (msg.role === 'user') {
			for (const contentPart of msg.content) {
				if (contentPart.type === 'text') {
					inputItems.push({
						role: 'user',
						content: contentPart.text,
					});
				}
			}
			continue;
		}

		if (msg.role === 'assistant') {
			for (const contentPart of msg.content) {
				if (contentPart.type === 'text') {
					inputItems.push({
						type: 'message',
						role: 'assistant',
						content: [
							{
								type: 'output_text',
								text: contentPart.text,
							},
						],
					});
				} else if (contentPart.type === 'tool-call') {
					if (!contentPart.toolCallId) {
						throw new Error('Tool call ID is required');
					}
					inputItems.push({
						type: 'function_call',
						call_id: contentPart.toolCallId,
						name: contentPart.toolName,
						arguments: contentPart.input,
					});
				}
				// Reasoning is not sent back. OpenAI can only reuse reasoning with its
				// encrypted payload, which this model does not request, and as assistant
				// text the model would read it as part of its own answer.
			}
		}

		if (msg.role === 'tool') {
			for (const contentPart of msg.content) {
				if (contentPart.type === 'tool-result') {
					const output =
						typeof contentPart.result === 'string'
							? contentPart.result
							: JSON.stringify(contentPart.result);
					inputItems.push({
						type: 'function_call_output',
						call_id: contentPart.toolCallId,
						output,
					});
				}
			}
		}
	}

	const instructions = instructionsParts.length > 0 ? instructionsParts.join('\n\n') : undefined;

	const single = inputItems[0];
	if (
		inputItems.length === 1 &&
		single &&
		'role' in single &&
		single.role === 'user' &&
		typeof single.content === 'string'
	) {
		return { instructions, input: single.content };
	}
	return { instructions, input: inputItems };
}

function genericToolToResponsesTool(tool: Tool): OpenAITool {
	if (tool.type === 'provider') {
		if (tool.name === 'web_search') {
			return {
				type: 'web_search',
				...tool.args,
			};
		}
		throw new Error(`Unsupported provider tool: ${tool.name}`);
	}
	const parameters = getParametersJsonSchema(tool);
	return {
		type: 'function',
		name: tool.name,
		description: tool.description,
		parameters,
		strict: tool.strict,
	};
}

function parseResponsesOutput(output: ResponsesOutputItem[]): {
	text: string;
	toolCalls: ToolCall[];
} {
	let text = '';
	const toolCalls: ToolCall[] = [];

	for (const item of output) {
		if (item.type === 'message' && item.role === 'assistant') {
			for (const block of item.content) {
				if (block.type === 'output_text') {
					text += block.text;
				}
			}
		}
		if (item.type === 'function_call') {
			try {
				toolCalls.push({
					id: toolCallId(item),
					name: item.name,
					arguments: JSON.parse(item.arguments) as Record<string, unknown>,
					argumentsRaw: item.arguments,
				});
			} catch (e) {
				throw new Error(`Failed to parse function call arguments: ${item.arguments}`);
			}
		}
	}

	return { text, toolCalls };
}

function parseTokenUsage(
	usage: OpenAIResponsesResponse['usage'] | undefined,
): TokenUsage | undefined {
	return usage
		? {
				promptTokens: usage.input_tokens ?? 0,
				completionTokens: usage.output_tokens ?? 0,
				totalTokens: usage.total_tokens ?? 0,
				inputTokenDetails: {
					...(!!usage.input_tokens_details?.cached_tokens && {
						cacheRead: usage.input_tokens_details.cached_tokens,
					}),
				},
				outputTokenDetails: {
					...(!!usage.output_tokens_details?.reasoning_tokens && {
						reasoning: usage.output_tokens_details.reasoning_tokens,
					}),
				},
			}
		: undefined;
}

function toolCallId({ call_id: callId, id }: { call_id?: unknown; id?: unknown }): string {
	const hasCallId = typeof callId === 'string' && callId !== '';
	const hasItemId = typeof id === 'string' && id !== '';
	switch (true) {
		case hasCallId:
			return callId;
		case !hasCallId && hasItemId:
			return id;
		default:
			// Some OpenAI-compatible servers send no ID. The generated one pairs the
			// call with its result when the conversation is sent back.
			return `call_${randomUUID()}`;
	}
}

function toFinishReason(
	response: Partial<OpenAIResponsesResponse>,
	hasToolCalls: boolean,
): FinishReason {
	const isIncomplete = response.status === 'incomplete';
	const isFiltered = response.incomplete_details?.reason === 'content_filter';
	switch (true) {
		case isIncomplete && isFiltered:
			return 'content-filter';
		case isIncomplete && !isFiltered:
			return 'length';
		case !isIncomplete && hasToolCalls:
			return 'tool-calls';
		case !isIncomplete && !hasToolCalls && response.status === 'completed':
			return 'stop';
		default:
			return 'other';
	}
}

function responseFailedError(response: Partial<OpenAIResponsesResponse> | undefined): Error {
	return new Error(`The model response failed: ${response?.error?.message ?? 'no error details'}`);
}

function isResponsesResponse(body: unknown): body is OpenAIResponsesResponse {
	return (
		typeof body === 'object' && body !== null && 'output' in body && Array.isArray(body.output)
	);
}

function definedHeaders(
	headers: Readonly<ChatModelConfig['headers']>,
): Record<string, string> | undefined {
	if (!headers) return undefined;
	const result: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers)) {
		if (value !== undefined) result[name] = value;
	}
	return result;
}

interface OpenAIChatModelConfig extends ChatModelConfig {
	apiKey?: string;
	baseURL?: string;
	toolChoice?: OpenAIToolChoice;

	providerTools?: ProviderTool[];
}

interface RequestConfig {
	httpRequest: (
		method: IHttpRequestMethods,
		url: string,
		body?: object,
		headers?: Record<string, string>,
		abortSignal?: ChatModelConfig['abortSignal'],
	) => Promise<{ body: unknown }>;
	openStream: (
		method: IHttpRequestMethods,
		url: string,
		body?: object,
		headers?: Record<string, string>,
		abortSignal?: ChatModelConfig['abortSignal'],
	) => Promise<{ body: AsyncIterableIterator<Buffer | Uint8Array> }>;
}

export class OpenAIChatModel extends BaseChatModel<OpenAIChatModelConfig> {
	private baseURL: string;

	constructor(
		modelId: string = 'gpt-4o',
		private requests: RequestConfig,
		config?: OpenAIChatModelConfig,
	) {
		super('openai', modelId, config);
		this.baseURL = config?.baseURL ?? 'https://api.openai.com/v1';
	}

	private buildRequestBody(
		messages: Message[],
		config: OpenAIChatModelConfig,
		stream: boolean,
	): OpenAIResponsesRequest {
		const { instructions, input } = genericMessagesToResponsesInput(messages);
		const providerTools = config.providerTools ?? this.defaultConfig?.providerTools ?? [];
		const tools = [...this.tools, ...providerTools];
		// The Responses API has no parameter for stop sequences, a seed or top-k
		// sampling, so those options are not sent.
		return {
			model: this.modelId,
			input,
			instructions,
			max_output_tokens: config.maxTokens,
			temperature: config.temperature,
			top_p: config.topP,
			presence_penalty: config.presencePenalty,
			frequency_penalty: config.frequencyPenalty,
			tools: tools.map(genericToolToResponsesTool),
			tool_choice: config.toolChoice,
			parallel_tool_calls: true,
			store: false,
			stream,
		};
	}

	async generate(messages: Message[], config?: OpenAIChatModelConfig): Promise<GenerateResult> {
		const merged: OpenAIChatModelConfig = { ...this.defaultConfig, ...config };
		const response = await this.requests.httpRequest(
			'POST',
			`${this.baseURL}/responses`,
			this.buildRequestBody(messages, merged, false),
			definedHeaders(merged.headers),
			merged.abortSignal,
		);
		const body = response.body;
		if (!isResponsesResponse(body)) {
			throw new Error('Unexpected response from the Responses API: the body has no output array');
		}
		if (body.status === 'failed') {
			throw responseFailedError(body);
		}

		const { text, toolCalls } = parseResponsesOutput(body.output);

		const usage = parseTokenUsage(body.usage);

		const responseMetadata: Record<string, unknown> = {
			model_provider: 'openai',
			model: body.model,
			created_at: body.created_at,
			id: body.id,
			incomplete_details: body.incomplete_details,
			metadata: body.metadata,
			object: body.object,
			status: body.status,
			user: body.user,
			service_tier: body.service_tier,
			model_name: body.model,
			output: body.output,
		};

		for (const item of body.output as unknown[]) {
			const o = item as Record<string, unknown>;
			if (o.type === 'reasoning') {
				responseMetadata.reasoning = o;
			}
		}

		const content: MessageContent[] = [];
		if (toolCalls.length) {
			for (const toolCall of toolCalls) {
				content.push({
					type: 'tool-call',
					toolCallId: toolCall.id,
					toolName: toolCall.name,
					input: JSON.stringify(toolCall.arguments),
				});
			}
		}
		content.push({ type: 'text', text });

		const message: Message = {
			role: 'assistant',
			content,
			id: body.id,
		};

		return {
			id: body.id,
			finishReason: toFinishReason(body, toolCalls.length > 0),
			usage,
			message,
			rawResponse: body,
			providerMetadata: responseMetadata,
		};
	}

	async *stream(messages: Message[], config?: OpenAIChatModelConfig): AsyncIterable<StreamChunk> {
		const merged: OpenAIChatModelConfig = { ...this.defaultConfig, ...config };
		const streamResponse = await this.requests.openStream(
			'POST',
			`${this.baseURL}/responses`,
			this.buildRequestBody(messages, merged, true),
			definedHeaders(merged.headers),
			merged.abortSignal,
		);
		const streamBody = streamResponse.body;

		const toolCallBuffers: Record<number, { name: string; arguments: string }> = {};
		let hasToolCalls = false;

		for await (const event of parseOpenAIStreamEvents(streamBody)) {
			const type = event.type;

			if (type === 'response.output_text.delta') {
				const delta = event.delta;
				if (delta) {
					yield { type: 'text-delta', delta };
				}
			}

			if (type === 'response.output_item.added') {
				const item = event.item;
				if (item?.type === 'function_call') {
					const idx = event.output_index ?? 0;
					toolCallBuffers[idx] = {
						name: (item.name as string) ?? '',
						arguments: (item.arguments as string) ?? '',
					};
				}
				if (item?.type === 'reasoning') {
					const summary = (item.summary as Array<Record<string, unknown>>) ?? [];
					const reasoningText = summary
						.map((s) => s.text)
						.filter(Boolean)
						.join('');
					if (reasoningText) {
						yield { type: 'reasoning-delta', delta: reasoningText };
					}
				}
			}

			if (type === 'response.reasoning_summary_text.delta') {
				const delta = event.delta;
				if (delta) {
					yield { type: 'reasoning-delta', delta };
				}
			}

			if (type === 'response.function_call_arguments.delta') {
				const idx = event.output_index ?? 0;
				const delta = event.delta;
				if (toolCallBuffers[idx] && delta) {
					toolCallBuffers[idx].arguments += delta;
				}
			}

			if (type === 'response.output_item.done') {
				const item = event.item;
				if (item?.type === 'function_call') {
					const idx = event.output_index ?? 0;
					const buf = toolCallBuffers[idx];
					if (buf) {
						hasToolCalls = true;
						yield {
							type: 'tool-call-delta',
							id: toolCallId(item),
							name: buf.name,
							argumentsDelta: buf.arguments,
						};
					}
				}
			}

			if (type === 'response.failed') {
				throw responseFailedError(event.response);
			}

			if (type === 'error') {
				throw new Error(`The model stream failed: ${event.message ?? 'no error details'}`);
			}

			const isFinished =
				type === 'response.done' || type === 'response.completed' || type === 'response.incomplete';
			if (isFinished) {
				const status = type === 'response.incomplete' ? 'incomplete' : 'completed';
				yield {
					type: 'finish',
					finishReason: toFinishReason({ status, ...event.response }, hasToolCalls),
					usage: parseTokenUsage(event.response?.usage ?? event.usage),
				};
			}
		}
	}
}
