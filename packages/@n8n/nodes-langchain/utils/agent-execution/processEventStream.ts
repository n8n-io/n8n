import type { AIMessageChunk, MessageContentText } from '@langchain/core/messages';
import type { StreamEvent } from '@langchain/core/types/stream';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { AgentResult, ToolCallRequest } from './types';
import { ModelTextStreamBuffer } from './modelTextStreamBuffer';

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
	const textStream = new ModelTextStreamBuffer((chunk) => {
		ctx.sendChunk('item', itemIndex, chunk);
		agentResult.output += chunk;
	});

	ctx.sendChunk('begin', itemIndex);
	for await (const event of eventStream) {
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
					textStream.append(event.run_id, chunkText);
				}
				break;
			case 'on_chat_model_end':
				// Capture full LLM response with tool calls for intermediate steps
				if (event.data) {
					const chatModelData = event.data;
					const output = chatModelData.output;

					const hasToolCalls = Boolean(output?.tool_calls?.length);
					textStream.complete(event.run_id, !hasToolCalls);

					if (hasToolCalls) {
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
					}
				}
				break;
			default:
				break;
		}
	}
	textStream.flushPending();
	ctx.sendChunk('end', itemIndex);

	// Include collected tool calls in the result
	if (toolCalls.length > 0) {
		agentResult.toolCalls = toolCalls;
	}

	return agentResult;
}
