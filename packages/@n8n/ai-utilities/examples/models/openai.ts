import type { JSONSchema7 } from 'json-schema';
import type { IHttpRequestMethods } from 'n8n-workflow';

import {
	BaseChatModel,
	getParametersJsonSchema,
	type ChatModelConfig,
	type GenerateResult,
	type Message,
	type StreamChunk,
	type Tool,
	type ToolCall,
	type TokenUsage,
	type ProviderTool,
	type MessageContent,
} from 'src';
import { parseSSEStream } from 'src';

export type OpenAITool =
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

export type OpenAIToolChoice = 'auto' | 'required' | 'none' | { type: 'function'; name: string };

export interface OpenAIResponsesRequest {
	model: string;
	input: string | ResponsesInputItem[];
	instructions?: string;
	max_output_tokens?: number;
	temperature?: number;
	top_p?: number;
	tools?: OpenAITool[];
	tool_choice?: OpenAIToolChoice;
	parallel_tool_calls?: boolean;
	store?: boolean;
	stream?: boolean;
	metadata?: Record<string, unknown>;
}

export interface OpenAIResponsesResponse {
	id: string;
	object: string;
	created_at: string;
	model: string;
	output: ResponsesOutputItem[];
	status: string;
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
	incomplete_details?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	user?: string;
	service_tier?: string;
}

export type ResponsesOutputItem =
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
			call_id: string;
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

export interface OpenAIStreamEvent {
	type: string;
	delta?: string;
	output_index?: number;
	item?: Record<string, unknown>;
	response?: Record<string, unknown>;
}

export interface OpenAIErrorResponse {
	error: {
		message: string;
		type: string;
		code?: string;
		param?: string;
	};
}

async function openAIFetch(
	fn: RequestConfig['httpRequest'],
	url: string,
	body: OpenAIResponsesRequest,
): Promise<OpenAIResponsesResponse> {
	const cleanedBody = Object.fromEntries(
		Object.entries(body).filter(([_, value]) => value !== undefined),
	);
	const response = await fn('POST', url, cleanedBody, {
		'Content-Type': 'application/json',
	});
	return response.body as OpenAIResponsesResponse;
}

async function openAIFetchStream(
	fn: RequestConfig['openStream'],
	url: string,
	body: OpenAIResponsesRequest,
): Promise<ReadableStream<Uint8Array>> {
	const cleanedBody = Object.fromEntries(
		Object.entries(body).filter(([_, value]) => value !== undefined),
	);
	const response = await fn('POST', url, cleanedBody, {
		'Content-Type': 'application/json',
	});
	return response.body;
}

async function* parseOpenAIStreamEvents(
	body: ReadableStream<Uint8Array>,
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
				} else if (contentPart.type === 'reasoning') {
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
				}
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

function parseResponsesOutput(output: unknown[]): {
	text: string;
	toolCalls: ToolCall[];
} {
	let text = '';
	const toolCalls: ToolCall[] = [];

	for (const item of output) {
		const o = item as Record<string, unknown>;
		if (o.type === 'message' && o.role === 'assistant') {
			const content = (o.content as Array<Record<string, unknown>>) ?? [];
			for (const block of content) {
				if (block.type === 'output_text' && typeof block.text === 'string') {
					text += block.text;
				}
			}
		}
		if (o.type === 'function_call') {
			try {
				toolCalls.push({
					id: (o.call_id as string) ?? (o.id as string),
					name: (o.name as string) ?? '',
					arguments: JSON.parse((o.arguments as string) ?? '{}') as Record<string, unknown>,
					argumentsRaw: (o.arguments as string) ?? undefined,
				});
			} catch (e) {
				const argumentsMsg = typeof o.arguments === 'string' ? o.arguments : typeof o.arguments;
				throw new Error(`Failed to parse function call arguments: ${argumentsMsg}`);
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

export interface OpenAIChatModelConfig extends ChatModelConfig {
	apiKey?: string;
	baseURL?: string;

	providerTools?: ProviderTool[];
}

export interface RequestConfig {
	httpRequest: (
		method: IHttpRequestMethods,
		url: string,
		body?: object,
		headers?: Record<string, string>,
	) => Promise<{ body: unknown }>;
	openStream: (
		method: IHttpRequestMethods,
		url: string,
		body?: object,
		headers?: Record<string, string>,
	) => Promise<{ body: ReadableStream<Uint8Array> }>;
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

	private getTools(config?: OpenAIChatModelConfig) {
		const ownTools = this.tools;
		const providerTools = config?.providerTools ?? [];
		return [...ownTools, ...providerTools].map(genericToolToResponsesTool);
	}

	async generate(messages: Message[], config?: OpenAIChatModelConfig): Promise<GenerateResult> {
		const merged = this.mergeConfig(config);
		const { instructions, input } = genericMessagesToResponsesInput(messages);
		const tools = this.getTools(config);
		const requestBody: OpenAIResponsesRequest = {
			model: this.modelId,
			input,
			instructions,
			max_output_tokens: merged.maxTokens,
			temperature: merged.temperature,
			top_p: merged.topP,
			tools,
			parallel_tool_calls: true,
			store: false,
			stream: false,
		};

		const response = await openAIFetch(
			this.requests.httpRequest,
			`${this.baseURL}/responses`,
			requestBody,
		);

		const { text, toolCalls } = parseResponsesOutput(response.output as unknown[]);

		const usage = parseTokenUsage(response.usage);

		const responseMetadata: Record<string, unknown> = {
			model_provider: 'openai',
			model: response.model,
			created_at: response.created_at,
			id: response.id,
			incomplete_details: response.incomplete_details,
			metadata: response.metadata,
			object: response.object,
			status: response.status,
			user: response.user,
			service_tier: response.service_tier,
			model_name: response.model,
			output: response.output,
		};

		for (const item of response.output as unknown[]) {
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
			id: response.id,
		};

		return {
			id: response.id,
			finishReason: response.status === 'completed' ? 'stop' : 'other',
			usage,
			message,
			rawResponse: response,
			providerMetadata: responseMetadata,
		};
	}

	async *stream(messages: Message[], config?: OpenAIChatModelConfig): AsyncIterable<StreamChunk> {
		const merged = this.mergeConfig(config) as OpenAIChatModelConfig;
		const { instructions, input } = genericMessagesToResponsesInput(messages);

		const tools = this.getTools(config);

		const requestBody: OpenAIResponsesRequest = {
			model: this.modelId,
			input,
			instructions,
			max_output_tokens: merged.maxTokens,
			temperature: merged.temperature,
			top_p: merged.topP,
			tools,
			parallel_tool_calls: true,
			store: false,
			stream: true,
		};

		const streamBody = await openAIFetchStream(
			this.requests.openStream,
			`${this.baseURL}/responses`,
			requestBody,
		);

		const toolCallBuffers: Record<number, { name: string; arguments: string }> = {};

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
						yield {
							type: 'tool-call-delta',
							id: (item.call_id as string) ?? (item.id as string),
							name: buf.name,
							argumentsDelta: buf.arguments,
						};
					}
				}
			}

			if (type === 'response.done' || type === 'response.completed') {
				const responseData =
					(event.response as unknown as OpenAIResponsesResponse) ??
					(event as unknown as OpenAIResponsesResponse);
				yield {
					type: 'finish',
					finishReason: 'stop',
					usage: parseTokenUsage(responseData.usage),
				};
			}
		}
	}
}
