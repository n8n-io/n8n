import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { AIMessageChunk, MessageContentText } from '@langchain/core/messages';
import type { IExecuteFunctions } from 'n8n-workflow';

import type { AgentResult, ToolCallRequest } from './types';
import { stringifyToolOutput } from './toolOutput';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function hasOwnProperty(data: object, property: string): boolean {
	return Object.prototype.hasOwnProperty.call(data, property);
}

function getToolOutputFromStreamEventData(data: unknown): string | undefined {
	if (isRecord(data) && hasOwnProperty(data, 'output')) {
		return stringifyToolOutput(data.output);
	}

	return stringifyToolOutput(data);
}

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
	const pendingToolCalls: Array<{ toolId?: string; toolName: string; toolType?: string }> = [];

	ctx.sendChunk({ type: 'begin', itemIndex });
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
					ctx.sendChunk({ type: 'item', content: chunkText, itemIndex });

					agentResult.output += chunkText;
				}
				break;
			case 'on_chat_model_end':
				// Capture full LLM response with tool calls for intermediate steps
				if (event.data) {
					const chatModelData = event.data;
					const output = chatModelData.output;

					// Check if this LLM response contains tool calls
					if (output?.tool_calls && output.tool_calls.length > 0) {
						// Collect tool calls for request building
						// Note: For Gemini, we pass additional_kwargs to ALL tool calls
						// so the signature can be applied to each when rebuilding
						for (const toolCall of output.tool_calls) {
							const toolMetadata = {
								...(toolCall.id ? { toolId: toolCall.id } : {}),
								toolName: toolCall.name,
								...(toolCall.type ? { toolType: toolCall.type } : {}),
							};
							const toolInput = JSON.stringify(toolCall.args);
							pendingToolCalls.push(toolMetadata);
							ctx.sendChunk({
								type: 'tool-call-start',
								metadata: {
									...toolMetadata,
									...(toolInput === undefined ? {} : { toolInput }),
								},
							});
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
			case 'on_tool_end':
				if (event.data) {
					const matchingToolCallIndex = pendingToolCalls.findIndex(
						(toolCall) => toolCall.toolName === event.name,
					);
					const matchingToolCall =
						matchingToolCallIndex === -1
							? { toolName: event.name ?? 'unknown' }
							: pendingToolCalls.splice(matchingToolCallIndex, 1)[0];
					const toolOutput = getToolOutputFromStreamEventData(event.data);
					ctx.sendChunk({
						type: 'tool-call-end',
						metadata: {
							...matchingToolCall,
							...(toolOutput === undefined ? {} : { toolOutput }),
						},
					});
				}
				break;
			default:
				break;
		}
	}
	ctx.sendChunk({ type: 'end', itemIndex });

	// Include collected tool calls in the result
	if (toolCalls.length > 0) {
		agentResult.toolCalls = toolCalls;
	}

	return agentResult;
}
