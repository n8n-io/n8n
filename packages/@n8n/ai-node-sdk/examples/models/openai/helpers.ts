import {
	getParametersJsonSchema,
	parseSSEStream,
	type Message,
	type TokenUsage,
	type Tool,
	type ToolCall,
} from '@n8n/ai-utilities';

import type {
	OpenAIResponsesResponse,
	OpenAIStreamEvent,
	OpenAITool,
	ResponsesInputItem,
	ResponsesOutputItem,
} from './types';

export async function* parseOpenAIStreamEvents(
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

export function genericMessagesToResponsesInput(messages: Message[]): {
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

export function genericToolToResponsesTool(tool: Tool): OpenAITool {
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

export function parseResponsesOutput(output: ResponsesOutputItem[]): {
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
					id: item.call_id,
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

export function parseTokenUsage(
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
