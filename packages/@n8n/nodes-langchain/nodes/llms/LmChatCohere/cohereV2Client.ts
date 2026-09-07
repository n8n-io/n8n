import { CohereClientV2 } from 'cohere-ai';
import type { Cohere, CohereClient } from 'cohere-ai';

/**
 * The bundled `@langchain/cohere` ChatCohere talks to Cohere's legacy `/v1/chat`
 * endpoint, which current models now reject with a 400 directing callers to
 * `/v2/chat`. ChatCohere lets us inject a custom `client`, so this module builds
 * one whose `chat`/`chatStream` route through `CohereClientV2` (the `/v2/chat`
 * endpoint), translating ChatCohere's v1-shaped requests into v2 requests and
 * the v2 responses back into the v1 shapes ChatCohere reads.
 */

/** Subset of the v1 request that ChatCohere builds and passes to the client. */
interface V1ChatRequest {
	message?: string;
	chatHistory?: V1ChatHistoryItem[];
	model?: string;
	temperature?: number;
	preamble?: string;
	tools?: V1Tool[];
	maxTokens?: number;
	stopSequences?: string[];
}

interface V1ToolCall {
	name: string;
	parameters: Record<string, unknown>;
}

interface V1ChatHistoryItem {
	role: 'SYSTEM' | 'USER' | 'CHATBOT' | 'TOOL';
	message?: string;
	toolCalls?: V1ToolCall[];
}

interface V1Tool {
	name: string;
	description: string;
	parameterDefinitions?: Record<string, { type: string; description?: string; required?: boolean }>;
}

/** Subset of the v1 response that ChatCohere reads back from the client. */
interface V1ChatResponse {
	text: string;
	toolCalls?: V1ToolCall[];
	meta?: { tokens?: { inputTokens?: number; outputTokens?: number } };
	finishReason?: string;
}

type V1StreamEvent =
	| { eventType: 'text-generation'; text: string }
	| { eventType: 'stream-end'; response: V1ChatResponse };

function parseArguments(args?: string): Record<string, unknown> {
	if (!args) return {};
	try {
		return JSON.parse(args) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function toV2Messages(request: V1ChatRequest): Cohere.ChatMessages {
	const messages: Cohere.ChatMessages = [];

	if (request.preamble) messages.push({ role: 'system', content: request.preamble });

	for (const item of request.chatHistory ?? []) {
		const content = item.message ?? '';
		switch (item.role) {
			case 'SYSTEM':
				messages.push({ role: 'system', content });
				break;
			case 'USER':
				messages.push({ role: 'user', content });
				break;
			case 'CHATBOT':
				messages.push({
					role: 'assistant',
					content,
					toolCalls: item.toolCalls?.map((toolCall) => ({
						type: 'function',
						function: { name: toolCall.name, arguments: JSON.stringify(toolCall.parameters) },
					})),
				});
				break;
			// TOOL-role history items carry no tool_call_id in the v1 shape, so they
			// cannot be mapped to a valid v2 tool message; skip them.
			case 'TOOL':
				break;
		}
	}

	if (request.message) messages.push({ role: 'user', content: request.message });

	return messages;
}

function toV2Tools(tools?: V1Tool[]): Cohere.ToolV2[] | undefined {
	if (!tools?.length) return undefined;

	return tools.map((tool) => {
		const definitions = tool.parameterDefinitions ?? {};
		const properties: Record<string, unknown> = {};
		const required: string[] = [];

		for (const [name, definition] of Object.entries(definitions)) {
			properties[name] = { type: definition.type, description: definition.description };
			if (definition.required) required.push(name);
		}

		return {
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters: { type: 'object', properties, required },
			},
		};
	});
}

function toV2Request(request: V1ChatRequest): Cohere.V2ChatRequest {
	return {
		model: request.model ?? '',
		messages: toV2Messages(request),
		temperature: request.temperature,
		maxTokens: request.maxTokens,
		stopSequences: request.stopSequences,
		tools: toV2Tools(request.tools),
	};
}

function extractText(message?: Cohere.AssistantMessageResponse): string {
	return (message?.content ?? []).map((item) => item.text ?? '').join('');
}

function extractToolCalls(message?: Cohere.AssistantMessageResponse): V1ToolCall[] | undefined {
	const toolCalls = (message?.toolCalls ?? [])
		.filter((toolCall) => toolCall.function?.name)
		.map((toolCall) => ({
			name: toolCall.function?.name ?? '',
			parameters: parseArguments(toolCall.function?.arguments),
		}));

	return toolCalls.length ? toolCalls : undefined;
}

function fromV2Response(response: Cohere.ChatResponse): V1ChatResponse {
	const toolCalls = extractToolCalls(response.message);
	// Only attach `toolCalls` when present: ChatCohere branches on the key
	// existing (`"toolCalls" in response`), not on its value.
	return {
		text: extractText(response.message),
		...(toolCalls ? { toolCalls } : {}),
		meta: {
			tokens: {
				inputTokens: response.usage?.tokens?.inputTokens,
				outputTokens: response.usage?.tokens?.outputTokens,
			},
		},
		finishReason: response.finishReason,
	};
}

async function* translateStream(
	stream: AsyncIterable<Cohere.StreamedChatResponseV2>,
): AsyncGenerator<V1StreamEvent> {
	const toolNames: string[] = [];
	const toolArgs: string[] = [];
	let finishReason: string | undefined;
	let usage: Cohere.Usage | undefined;

	for await (const event of stream) {
		switch (event.type) {
			case 'content-delta': {
				const text = event.delta?.message?.content?.text;
				if (text) yield { eventType: 'text-generation', text };
				break;
			}
			case 'tool-call-start': {
				const index = event.index ?? toolNames.length;
				toolNames[index] = event.delta?.toolCall?.function?.name ?? '';
				toolArgs[index] = event.delta?.toolCall?.function?.arguments ?? '';
				break;
			}
			case 'tool-call-delta': {
				const index = event.index ?? 0;
				toolArgs[index] =
					(toolArgs[index] ?? '') + (event.delta?.toolCall?.function?.arguments ?? '');
				break;
			}
			case 'message-end': {
				finishReason = event.delta?.finishReason;
				usage = event.delta?.usage;
				break;
			}
			default:
				break;
		}
	}

	const toolCalls: V1ToolCall[] = [];
	for (let index = 0; index < toolNames.length; index++) {
		if (toolNames[index]) {
			toolCalls.push({ name: toolNames[index], parameters: parseArguments(toolArgs[index]) });
		}
	}

	yield {
		eventType: 'stream-end',
		response: {
			text: '',
			toolCalls: toolCalls.length ? toolCalls : undefined,
			meta: {
				tokens: {
					inputTokens: usage?.tokens?.inputTokens,
					outputTokens: usage?.tokens?.outputTokens,
				},
			},
			finishReason,
		},
	};
}

/**
 * Builds a Cohere client for ChatCohere that targets the `/v2/chat` endpoint.
 * ChatCohere only calls `chat`/`chatStream` on its injected client, so this
 * object implements exactly that slice; the cast bridges the v1 client type
 * ChatCohere expects with our v2-routing implementation.
 */
export function createCohereV2ChatClient(options: { apiKey?: string }): CohereClient {
	const v2Client = new CohereClientV2({ token: options.apiKey });

	const chatClient = {
		chat: async (request: V1ChatRequest): Promise<V1ChatResponse> =>
			fromV2Response(await v2Client.chat(toV2Request(request))),
		chatStream: async (request: V1ChatRequest): Promise<AsyncIterable<V1StreamEvent>> =>
			translateStream(await v2Client.chatStream(toV2Request(request))),
	};

	return chatClient as unknown as CohereClient;
}
