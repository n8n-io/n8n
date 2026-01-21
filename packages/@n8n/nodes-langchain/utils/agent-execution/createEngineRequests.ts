import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { EngineRequest, IDataObject } from 'n8n-workflow';

import { isThinkingBlock, isRedactedThinkingBlock, isGeminiThoughtSignatureBlock } from './types';
import type { RequestResponseMetadata, ToolCallRequest } from './types';

/**
 * Creates engine requests from tool calls.
 * Maps tool call information to the format expected by the n8n engine
 * for executing tool nodes.
 *
 * This is a generalized version that can be used across different agent types
 * (Tools Agent, OpenAI Functions Agent, etc.).
 *
 * @param toolCalls - Array of tool call requests to convert
 * @param itemIndex - The current item index
 * @param tools - Array of available tools
 * @returns Array of engine request objects (filtered to remove undefined entries)
 */
export async function createEngineRequests(
	toolCalls: ToolCallRequest[],
	itemIndex: number,
	tools: Array<DynamicStructuredTool | Tool>,
): Promise<EngineRequest<RequestResponseMetadata>['actions']> {
	// For parallel tool calls, LangChain may only populate messageLog on the first action.
	// Find a shared messageLog to use for all tool calls in this batch.
	const sharedMessageLog = toolCalls.find(
		(tc) => tc.messageLog && tc.messageLog.length > 0,
	)?.messageLog;
	// Similarly for additionalKwargs (contains Gemini thought signatures)
	const sharedAdditionalKwargs = toolCalls.find((tc) => tc.additionalKwargs)?.additionalKwargs;

	return toolCalls
		.map((toolCall) => {
			// First try to get from metadata (for toolkit tools)
			const foundTool = tools.find((tool) => tool.name === toolCall.tool);

			if (!foundTool) return undefined;

			const nodeName = foundTool.metadata?.sourceNodeName;

			// Ensure nodeName is defined and is a string
			if (typeof nodeName !== 'string') return undefined;

			// For toolkit tools, include the tool name so the node knows which tool to execute
			const input: IDataObject = foundTool.metadata?.isFromToolkit
				? ({ ...toolCall.toolInput, tool: toolCall.tool } as IDataObject)
				: (toolCall.toolInput as IDataObject);

			// Extract thought_signature from the AIMessage in messageLog (for Gemini 3)
			let thoughtSignature: string | undefined;
			// Extract thinking blocks from the AIMessage in messageLog (for Anthropic)
			let thinkingContent: string | undefined;
			let thinkingType: 'thinking' | 'redacted_thinking' | undefined;
			let thinkingSignature: string | undefined;

			// Use toolCall's additionalKwargs or fall back to shared one from batch
			const effectiveAdditionalKwargs = toolCall.additionalKwargs || sharedAdditionalKwargs;
			// Use toolCall's messageLog or fall back to shared one from batch
			const effectiveMessageLog =
				toolCall.messageLog && toolCall.messageLog.length > 0
					? toolCall.messageLog
					: sharedMessageLog;

			// First check additionalKwargs on the toolCall itself (Gemini thought signatures via LangChain)
			if (effectiveAdditionalKwargs) {
				// Check for signature mapped by tool call ID
				const geminiSignatures = effectiveAdditionalKwargs[
					'__gemini_function_call_thought_signatures__'
				] as Record<string, string> | undefined;
				if (geminiSignatures && typeof geminiSignatures === 'object') {
					// Get signature for this specific tool call, or ANY signature if ID not found
					// (for parallel calls, signature may be keyed to first call's ID)
					thoughtSignature =
						geminiSignatures[toolCall.toolCallId] || Object.values(geminiSignatures)[0];
				}

				// Also check signatures array format (LangChain Google uses this)
				if (!thoughtSignature) {
					const signatures = effectiveAdditionalKwargs.signatures as string[] | undefined;
					if (signatures && Array.isArray(signatures) && signatures.length > 0) {
						// First non-empty signature (parallel calls have signature only on first)
						thoughtSignature = signatures.find((s) => s && s.length > 0);
					}
				}
			}

			if (effectiveMessageLog && Array.isArray(effectiveMessageLog)) {
				for (const message of effectiveMessageLog) {
					// Check if message has content that could contain thought_signature or thinking blocks
					if (message && typeof message === 'object' && 'content' in message) {
						const content = message.content;
						// Content can be string or array of content blocks
						if (Array.isArray(content)) {
							// Look for thought_signature in content blocks (Gemini)
							// and thinking/redacted_thinking blocks (Anthropic)
							for (const block of content) {
								// Gemini thought_signature as content block (only if not already found)
								if (!thoughtSignature && isGeminiThoughtSignatureBlock(block)) {
									thoughtSignature = block.thoughtSignature;
								}

								// Anthropic thinking blocks
								if (isThinkingBlock(block)) {
									thinkingContent = block.thinking;
									thinkingType = 'thinking';
									thinkingSignature = block.signature;
								} else if (isRedactedThinkingBlock(block)) {
									thinkingContent = block.data;
									thinkingType = 'redacted_thinking';
								}
							}
						}

						// Also check additional_kwargs on the message for Gemini thought signatures
						if (!thoughtSignature && 'additional_kwargs' in message) {
							const msgAdditionalKwargs = message.additional_kwargs as
								| Record<string, unknown>
								| undefined;
							if (msgAdditionalKwargs) {
								// First check the map format: __gemini_function_call_thought_signatures__
								const geminiSignatures = msgAdditionalKwargs[
									'__gemini_function_call_thought_signatures__'
								] as Record<string, string> | undefined;
								if (geminiSignatures && typeof geminiSignatures === 'object') {
									// Get signature for this tool call, or ANY signature for parallel calls
									thoughtSignature =
										geminiSignatures[toolCall.toolCallId] || Object.values(geminiSignatures)[0];
								}

								// If not found, check the signatures array format
								// LangChain Google returns signatures as an array that corresponds to tool_calls array
								if (!thoughtSignature) {
									const signatures = msgAdditionalKwargs.signatures as string[] | undefined;
									// Get tool_calls from message (not from additional_kwargs)
									const msgToolCalls =
										'tool_calls' in message
											? (message.tool_calls as Array<{ id?: string }> | undefined)
											: undefined;

									if (signatures && Array.isArray(signatures)) {
										if (msgToolCalls && Array.isArray(msgToolCalls)) {
											// Find the index of this tool call by ID
											const toolCallIndex = msgToolCalls.findIndex(
												(tc) => tc.id === toolCall.toolCallId,
											);
											if (toolCallIndex !== -1 && toolCallIndex < signatures.length) {
												thoughtSignature = signatures[toolCallIndex];
											}
										}
										// Fallback: get first non-empty signature
										if (!thoughtSignature) {
											thoughtSignature = signatures.find((s) => s && s.length > 0);
										}
									}
								}
							}
						}

						if (thoughtSignature || thinkingContent) break;
					}
				}
			}

			return {
				actionType: 'ExecutionNodeAction' as const,
				nodeName,
				input,
				type: NodeConnectionTypes.AiTool,
				id: toolCall.toolCallId,
				metadata: {
					itemIndex,
					...(thoughtSignature && {
						google: {
							thoughtSignature,
						},
					}),
					...(thinkingContent && {
						anthropic: {
							thinkingContent,
							thinkingType,
							thinkingSignature,
						},
					}),
				},
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== undefined);
}
