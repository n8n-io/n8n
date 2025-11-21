import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { AIMessageChunk, MessageContentText } from '@langchain/core/messages';
import type { BaseChatMemory } from 'langchain/memory';
import type { IExecuteFunctions } from 'n8n-workflow';

import { saveToMemory, saveToolResultsToMemory } from './memoryManagement';
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
 * @param returnIntermediateSteps - Whether to capture intermediate steps
 * @param memory - Optional memory for saving context
 * @param input - The original input prompt
 * @returns AgentResult containing output and optional tool calls/steps
 */
export async function processEventStream(
	ctx: IExecuteFunctions,
	eventStream: IterableReadableStream<StreamEvent>,
	itemIndex: number,
	returnIntermediateSteps: boolean = false,
	memory?: BaseChatMemory,
	input?: string,
): Promise<AgentResult> {
	const agentResult: AgentResult = {
		output: '',
	};

	if (returnIntermediateSteps) {
		agentResult.intermediateSteps = [];
	}

	const toolCalls: ToolCallRequest[] = [];

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
					ctx.sendChunk('item', itemIndex, chunkText);

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
							});
						}

						// Also add to intermediate steps if needed
						if (returnIntermediateSteps) {
							for (const toolCall of output.tool_calls) {
								agentResult.intermediateSteps?.push({
									action: {
										tool: toolCall.name,
										toolInput: toolCall.args,
										log:
											output.content ||
											`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
										messageLog: [output], // Include the full LLM response
										toolCallId: toolCall.id || 'unknown',
										type: toolCall.type || 'tool_call',
									},
									observation: '',
								});
							}
						}
					}
				}
				break;
			case 'on_tool_end':
				// Capture tool execution results and match with action
				if (returnIntermediateSteps && event.data && agentResult.intermediateSteps!.length > 0) {
					const toolData = event.data as { output?: string };
					// Find the matching intermediate step for this tool call
					const matchingStep = agentResult.intermediateSteps?.find(
						(step) => !step.observation && step.action.tool === event.name,
					);
					if (matchingStep) {
						matchingStep.observation = toolData.output || '';

						// Save tool result to memory
						if (matchingStep.observation && input) {
							await saveToolResultsToMemory(
								input,
								[
									{
										action: matchingStep.action,
										observation: matchingStep.observation,
									},
								],
								memory,
							);
						}
					}
				}
				break;
			default:
				break;
		}
	}
	ctx.sendChunk('end', itemIndex);

	// Save conversation to memory if memory is connected
	if (input && agentResult.output) {
		await saveToMemory(input, agentResult.output, memory);
	}

	// Include collected tool calls in the result
	if (toolCalls.length > 0) {
		agentResult.toolCalls = toolCalls;
	}

	return agentResult;
}
