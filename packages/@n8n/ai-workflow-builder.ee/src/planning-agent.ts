/**
 * Planning Agent
 *
 * LLM agent that creates workflow plans by:
 * 1. Analyzing user requests to identify workflow techniques
 * 2. Searching for appropriate nodes
 * 3. Retrieving best practices for identified techniques
 * 4. Producing a detailed markdown plan for the coding agent
 *
 * The planning agent can also answer questions directly if they don't require workflow generation.
 */

import { inspect } from 'node:util';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { buildPlanningAgentPrompt } from './prompts/planning';
import { createOneShotNodeSearchTool } from './tools/one-shot-node-search.tool';
import { createGetBestPracticesTool } from './tools/get-best-practices.tool';
import type { NodeTypeParser } from './utils/node-type-parser';
import type { StreamOutput, ToolProgressChunk } from './types/streaming';

/** Maximum iterations for the planning agent loop */
const MAX_PLANNING_ITERATIONS = 10;

/**
 * Response from the planning agent
 */
export interface PlanningAgentResponse {
	type: 'plan' | 'answer';
	content: string;
}

/**
 * Configuration for the planning agent
 */
export interface PlanningAgentConfig {
	/** LLM for planning */
	llm: BaseChatModel;
	/** Parsed node types from n8n */
	nodeTypeParser: NodeTypeParser;
	/** Optional logger */
	logger?: Logger;
}

/**
 * Planning Agent
 *
 * Creates workflow plans by analyzing user requests, searching for nodes,
 * and retrieving best practices.
 */
export class PlanningAgent {
	private llm: BaseChatModel;
	private nodeTypeParser: NodeTypeParser;
	private logger?: Logger;
	private tools: StructuredToolInterface[];
	private toolsMap: Map<string, StructuredToolInterface>;

	constructor(config: PlanningAgentConfig) {
		this.llm = config.llm;
		this.nodeTypeParser = config.nodeTypeParser;
		this.logger = config.logger;

		// Create tools for the planning agent
		const searchTool = createOneShotNodeSearchTool(this.nodeTypeParser);
		const bestPracticesTool = createGetBestPracticesTool();
		this.tools = [searchTool, bestPracticesTool];
		this.toolsMap = new Map(this.tools.map((t) => [t.name, t]));

		this.debugLog('CONSTRUCTOR', 'PlanningAgent initialized', {
			toolNames: this.tools.map((t) => t.name),
		});
	}

	/**
	 * Debug logging helper
	 */
	private debugLog(context: string, message: string, data?: Record<string, unknown>): void {
		const timestamp = new Date().toISOString();
		const prefix = `[PLANNING-AGENT][${timestamp}][${context}]`;

		if (data) {
			const formatted = inspect(data, {
				depth: null,
				colors: true,
				maxStringLength: null,
				maxArrayLength: null,
				breakLength: 120,
			});
			console.log(`${prefix} ${message}\n${formatted}`);
		} else {
			console.log(`${prefix} ${message}`);
		}
	}

	/**
	 * Run the planning agent and stream output
	 *
	 * @param userMessage - The user's request
	 * @param currentWorkflow - Optional existing workflow for context
	 * @param abortSignal - Optional abort signal
	 * @yields StreamOutput chunks for tool progress and messages
	 * @returns The final planning agent response (plan or answer)
	 */
	async *run(
		userMessage: string,
		currentWorkflow?: WorkflowJSON,
		abortSignal?: AbortSignal,
	): AsyncGenerator<StreamOutput, PlanningAgentResponse, unknown> {
		this.debugLog('RUN', '========== PLANNING AGENT STARTING ==========');
		this.debugLog('RUN', 'Input', {
			userMessageLength: userMessage.length,
			userMessage,
			hasCurrentWorkflow: !!currentWorkflow,
		});

		this.logger?.debug('Planning agent starting', {
			userMessageLength: userMessage.length,
			hasCurrentWorkflow: !!currentWorkflow,
		});

		try {
			// Build prompt
			const prompt = buildPlanningAgentPrompt(currentWorkflow);

			// Bind tools to LLM
			if (!this.llm.bindTools) {
				throw new Error('LLM does not support bindTools');
			}
			const llmWithTools = this.llm.bindTools(this.tools);

			// Format initial messages
			const formattedMessages = await prompt.formatMessages({ userMessage });
			const messages: BaseMessage[] = [...formattedMessages];

			// Run agentic loop
			let iteration = 0;
			let finalResponse: PlanningAgentResponse | null = null;

			while (iteration < MAX_PLANNING_ITERATIONS) {
				iteration++;
				this.debugLog('RUN', `========== ITERATION ${iteration} ==========`);

				// Check for abort
				if (abortSignal?.aborted) {
					this.debugLog('RUN', 'Abort signal received');
					throw new Error('Aborted');
				}

				// Invoke LLM
				this.debugLog('RUN', 'Invoking LLM...');
				const response = await llmWithTools.invoke(messages, { signal: abortSignal });

				// Add AI message to history
				messages.push(response);

				// Check if there are tool calls
				if (response.tool_calls && response.tool_calls.length > 0) {
					this.debugLog('RUN', 'Processing tool calls...', {
						toolCalls: response.tool_calls.map((tc) => ({
							name: tc.name,
							id: tc.id ?? 'unknown',
						})),
					});

					// Execute tool calls and stream progress
					for (const toolCall of response.tool_calls) {
						if (!toolCall.id) {
							this.debugLog('RUN', 'Skipping tool call without ID', { name: toolCall.name });
							continue;
						}
						yield* this.executeToolCall(
							{ name: toolCall.name, args: toolCall.args, id: toolCall.id },
							messages,
						);
					}
				} else {
					// No tool calls - try to parse as final response
					this.debugLog('RUN', 'No tool calls, attempting to parse final response...');
					const textContent = this.extractTextContent(response);

					if (textContent) {
						const parsed = this.parseJsonResponse(textContent);
						if (parsed) {
							finalResponse = parsed;
							this.debugLog('RUN', 'Final response parsed successfully', {
								type: finalResponse.type,
								contentLength: finalResponse.content.length,
							});
							break;
						} else {
							// If we couldn't parse JSON, ask the LLM to format correctly
							this.debugLog('RUN', 'Failed to parse JSON response, requesting correction');
							messages.push({
								type: 'human',
								content:
									'Your response must be valid JSON with "type" and "content" fields. Please format your response correctly.',
							} as BaseMessage);
						}
					}
				}
			}

			if (!finalResponse) {
				throw new Error(
					`Planning agent failed to produce a valid response after ${MAX_PLANNING_ITERATIONS} iterations`,
				);
			}

			this.debugLog('RUN', '========== PLANNING AGENT COMPLETE ==========', {
				type: finalResponse.type,
				contentLength: finalResponse.content.length,
			});

			return finalResponse;
		} catch (error) {
			this.debugLog('RUN', '========== PLANNING AGENT FAILED ==========', {
				errorMessage: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Extract text content from an AI message
	 */
	private extractTextContent(message: AIMessage): string | null {
		if (typeof message.content === 'string') {
			return message.content || null;
		}

		if (Array.isArray(message.content)) {
			const textParts = message.content
				.filter(
					(block): block is { type: 'text'; text: string } =>
						typeof block === 'object' && block !== null && 'type' in block && block.type === 'text',
				)
				.map((block) => block.text);

			return textParts.length > 0 ? textParts.join('\n') : null;
		}

		return null;
	}

	/**
	 * Parse JSON response from the LLM
	 */
	private parseJsonResponse(content: string): PlanningAgentResponse | null {
		try {
			// Try to extract JSON from markdown code blocks if present
			const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
			const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

			const parsed = JSON.parse(jsonStr) as unknown;

			// Validate the parsed response
			if (
				typeof parsed === 'object' &&
				parsed !== null &&
				'type' in parsed &&
				'content' in parsed &&
				(parsed.type === 'plan' || parsed.type === 'answer') &&
				typeof parsed.content === 'string'
			) {
				return parsed as PlanningAgentResponse;
			}

			this.debugLog('PARSE', 'Invalid JSON structure', { parsed });
			return null;
		} catch (error) {
			this.debugLog('PARSE', 'JSON parse error', {
				error: error instanceof Error ? error.message : String(error),
				contentPreview: content.substring(0, 500),
			});
			return null;
		}
	}

	/**
	 * Execute a tool call and yield progress updates
	 */
	private async *executeToolCall(
		toolCall: { name: string; args: Record<string, unknown>; id: string },
		messages: BaseMessage[],
	): AsyncGenerator<StreamOutput, void, unknown> {
		this.debugLog('TOOL_CALL', `Executing tool: ${toolCall.name}`, {
			toolCallId: toolCall.id,
			args: toolCall.args,
		});

		// Stream tool progress - running
		yield {
			messages: [
				{
					type: 'tool',
					toolName: toolCall.name,
					status: 'running',
					args: toolCall.args,
				} as ToolProgressChunk,
			],
		};

		const tool = this.toolsMap.get(toolCall.name);
		if (!tool) {
			const errorMessage = `Tool '${toolCall.name}' not found`;
			this.debugLog('TOOL_CALL', errorMessage);
			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id,
					content: errorMessage,
				}),
			);
			return;
		}

		try {
			const toolStartTime = Date.now();
			const result = await tool.invoke(toolCall.args);
			const toolDuration = Date.now() - toolStartTime;

			this.debugLog('TOOL_CALL', `Tool ${toolCall.name} completed`, {
				toolDurationMs: toolDuration,
				resultLength: typeof result === 'string' ? result.length : JSON.stringify(result).length,
			});

			// Add tool result to messages
			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id,
					content: typeof result === 'string' ? result : JSON.stringify(result),
				}),
			);

			// Stream tool completion
			yield {
				messages: [
					{
						type: 'tool',
						toolName: toolCall.name,
						status: 'completed',
					} as ToolProgressChunk,
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.debugLog('TOOL_CALL', `Tool ${toolCall.name} failed`, { error: errorMessage });

			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id,
					content: `Error: ${errorMessage}`,
				}),
			);

			yield {
				messages: [
					{
						type: 'tool',
						toolName: toolCall.name,
						status: 'error',
						error: errorMessage,
					} as ToolProgressChunk,
				],
			};
		}
	}
}
