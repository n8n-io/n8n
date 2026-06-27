import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { AIMessageChunk, MessageContentText } from '@langchain/core/messages';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { AgentResult, ToolCallRequest } from './types';

/**
 * Processes the event stream from a streaming agent execution.
 * Handles streaming chunks, tool calls, and intermediate steps.
 *
 * This is a generalized version that can be used across different agent types
 * (Tools Agent, OpenAI Functions Agent, etc.).
 *
 * @param ctx - The execution context
 * @param eventStream - The stream of events from the agent
 * @param itemIndex - The current item index
 * @returns AgentResult containing output and optional tool calls/steps
 */
export async function processEventStream(
	ctx: IExecuteFunctions,
	eventStream: IterableReadableStream<StreamEvent>,
	itemIndex: number,
): Promise<AgentResult> {
	const agentResult: AgentResult = {
		output: '',
	};

	const toolCalls: ToolCallRequest[] = [];

	// Buffer streamed text chunks per LLM turn. Some models emit text content
	// in the same response that also contains tool_calls (e.g. a brief reasoning
	// token before the tool invocation). We must not send those intermediate
	// tokens to the client until on_chat_model_end confirms there are no
	// tool_calls in this turn; if there are, we discard the buffer so the
	// pre-tool text never reaches the client.
	let textBuffer = '';

	ctx.sendChunk('begin', itemIndex);
	for await (const event of eventStream) {
		// Stream chat model tokens as they come in
		switch (event.event) {
			case 'on_chat_model_stream':
				const chunk = event.data?.chunk as AIMessageChunk;
				if (chunk?.content) {
					const chunkContent = chunk.content;
					let chunkText = '';
					if (Array.isArray(chunkContent)) {
						for (const message of chunkContent) {
							if (message?.type === 'text') {
								chunkText += (message as MessageContentText)?.text;
							}
						}
					} else if (typeof chunkContent === 'string') {
						chunkText = chunkContent;
					}
					// Buffer instead of sending immediately. We only know whether
					// this turn has tool_calls once on_chat_model_end fires.
					textBuffer += chunkText;
				}
				break;
			case 'on_chat_model_end':
				// Capture full LLM response with tool calls for intermediate steps
				if (event.data) {
					const chatModelData = event.data;
					const output = chatModelData.output;

					// Check if this LLM response contains tool calls
					if (output?.tool_calls && output.tool_calls.length > 0) {
						// This turn has tool_calls — discard any buffered text so
						// intermediate reasoning/address tokens are not streamed to
						// the client and do not appear in the final output.
						textBuffer = '';

						// Collect tool calls for request building
						// Note: For Gemini, we pass additional_kwargs to ALL tool calls
						// so the signature can be applied to each when rebuilding
						for (const toolCall of output.tool_calls) {
							toolCalls.push({
								tool: toolCall.name,
								toolInput: toolCall.args,
								toolCallId: toolCall.id || 'unknown',
								type: toolCall.type || 'tool_call',
								log:
									output.content ||
									`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
								messageLog: [output],
								// Pass additional_kwargs to ALL tool calls so signature is available
								additionalKwargs: output.additional_kwargs as Record<string, unknown> | undefined,
							});
						}
					} else {
						// No tool_calls — this is a final text response. Flush the
						// buffered chunks to the client now.
						if (textBuffer) {
							ctx.sendChunk('item', itemIndex, textBuffer);
							agentResult.output += textBuffer;
							textBuffer = '';
						}
					}
				}
				break;
			default:
				break;
		}
	}
	ctx.sendChunk('end', itemIndex);

	// Include collected tool calls in the result
	if (toolCalls.length > 0) {
		agentResult.toolCalls = toolCalls;
	}

	return agentResult;
}
