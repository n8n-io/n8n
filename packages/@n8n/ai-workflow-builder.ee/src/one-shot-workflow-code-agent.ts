/* eslint-disable complexity */
/**
 * One-Shot Workflow Code Agent
 *
 * Generates complete workflows using TypeScript SDK format with an agentic loop
 * that handles tool calls for node discovery before producing the final workflow.
 *
 * POC with extensive debug logging for development.
 */

import { inspect } from 'node:util';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';
import { parseWorkflowCode, validateWorkflow, SDK_API_CONTENT } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { typeCheckCode } from './evaluators/code-typecheck/type-checker';

import { NodeTypeParser } from './utils/node-type-parser';
import { buildOneShotGeneratorPrompt } from './prompts/one-shot-generator.prompt';
import { buildOpusOneShotGeneratorPrompt } from './prompts/one-shot-generator-opus.prompt';
import { createOneShotNodeSearchTool } from './tools/one-shot-node-search.tool';
import type { ModelId } from './llm-config';
import { createOneShotNodeGetTool } from './tools/one-shot-node-get.tool';
import type {
	StreamOutput,
	AgentMessageChunk,
	WorkflowUpdateChunk,
	ToolProgressChunk,
	StreamGenerationError,
} from './types/streaming';
import type { ChatPayload } from './workflow-builder-agent';

/** Maximum iterations for the agentic loop to prevent infinite loops */
const MAX_AGENT_ITERATIONS = 25;

/** Claude Sonnet 4.5 pricing per million tokens (USD) */
const SONNET_4_5_PRICING = {
	inputPerMillion: 3,
	outputPerMillion: 15,
};

/**
 * Calculate cost estimate based on token usage
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
	const inputCost = (inputTokens / 1_000_000) * SONNET_4_5_PRICING.inputPerMillion;
	const outputCost = (outputTokens / 1_000_000) * SONNET_4_5_PRICING.outputPerMillion;
	return inputCost + outputCost;
}

/**
 * Format duration in a human-readable way
 */
function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	}
	const seconds = ms / 1000;
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Debug logging helper - logs to console with timestamp and prefix
 * Uses util.inspect for terminal-friendly output with full depth
 */
function debugLog(context: string, message: string, data?: Record<string, unknown>): void {
	const timestamp = new Date().toISOString();
	const prefix = `[ONE-SHOT-AGENT][${timestamp}][${context}]`;
	if (data) {
		const formatted = inspect(data, {
			depth: null, // Full depth
			colors: true, // Terminal colors
			maxStringLength: null, // No string truncation
			maxArrayLength: null, // No array truncation
			breakLength: 120, // Line wrap at 120 chars
		});
		console.log(`${prefix} ${message}\n${formatted}`);
	} else {
		console.log(`${prefix} ${message}`);
	}
}

/**
 * Get the SDK API reference for the prompt.
 * Uses SDK_API_CONTENT which is embedded at build time to avoid disk reads.
 * Contains only what the LLM needs to generate workflow code.
 */
function getSdkSourceCode(): string {
	debugLog('INIT', 'Using embedded SDK API content', { contentLength: SDK_API_CONTENT.length });
	return SDK_API_CONTENT;
}

/**
 * Structured output schema for the LLM response
 */
const WorkflowCodeOutputSchema = z.object({
	workflowCode: z
		.string()
		.describe("Complete TypeScript SDK code starting with 'return workflow(...)'"),
});

type WorkflowCodeOutput = z.infer<typeof WorkflowCodeOutputSchema>;

/**
 * Configuration for the one-shot agent
 */
export interface OneShotWorkflowCodeAgentConfig {
	/** LLM for generation */
	llm: BaseChatModel;
	/** Parsed node types from n8n */
	nodeTypes: INodeTypeDescription[];
	/** Optional logger */
	logger?: Logger;
	/**
	 * Path to the generated types directory (from InstanceSettings.generatedTypesDir).
	 * If not provided, falls back to workflow-sdk static types.
	 */
	generatedTypesDir?: string;
	/**
	 * Optional model ID to select the appropriate prompt.
	 * - 'claude-opus-4.5': Uses the Opus 4.5 prompt with full SDK reference
	 * - Other models: Uses the Sonnet 4.5 optimized prompt (condensed, no SDK reference)
	 */
	modelId?: ModelId;
}

/**
 * One-Shot Workflow Code Agent
 *
 * Generates workflows by:
 * 1. Building a comprehensive system prompt with node docs
 * 2. Running an agentic loop that handles tool calls for node discovery
 * 3. Parsing the final TypeScript code to WorkflowJSON
 * 4. Validating and streaming the result
 */
export class OneShotWorkflowCodeAgent {
	private llm: BaseChatModel;
	private nodeTypeParser: NodeTypeParser;
	private logger?: Logger;
	private sdkSourceCode: string;
	private tools: StructuredToolInterface[];
	private toolsMap: Map<string, StructuredToolInterface>;
	private modelId?: ModelId;

	constructor(config: OneShotWorkflowCodeAgentConfig) {
		debugLog('CONSTRUCTOR', 'Initializing OneShotWorkflowCodeAgent...', {
			nodeTypesCount: config.nodeTypes.length,
			hasLogger: !!config.logger,
			modelId: config.modelId,
		});
		this.llm = config.llm;
		this.nodeTypeParser = new NodeTypeParser(config.nodeTypes);
		this.logger = config.logger;
		this.sdkSourceCode = getSdkSourceCode();
		this.modelId = config.modelId;

		// Create tools
		const searchTool = createOneShotNodeSearchTool(this.nodeTypeParser);
		const getTool = createOneShotNodeGetTool({ generatedTypesDir: config.generatedTypesDir });
		this.tools = [searchTool, getTool];
		this.toolsMap = new Map(this.tools.map((t) => [t.name, t]));

		debugLog('CONSTRUCTOR', 'OneShotWorkflowCodeAgent initialized', {
			sdkSourceCodeLength: this.sdkSourceCode.length,
			toolNames: this.tools.map((t) => t.name),
		});
	}

	/**
	 * Main chat method - generates workflow and streams output
	 * Implements an agentic loop that handles tool calls for node discovery
	 */
	async *chat(
		payload: ChatPayload,
		userId: string,
		abortSignal?: AbortSignal,
	): AsyncGenerator<StreamOutput, void, unknown> {
		const startTime = Date.now();
		debugLog('CHAT', '========== STARTING CHAT ==========');
		debugLog('CHAT', 'Input payload', {
			userId,
			messageLength: payload.message.length,
			message: payload.message,
			hasWorkflowContext: !!payload.workflowContext,
			hasCurrentWorkflow: !!payload.workflowContext?.currentWorkflow,
		});

		try {
			this.logger?.debug('One-shot agent starting', {
				userId,
				messageLength: payload.message.length,
			});

			// Build prompt with current workflow context if available
			debugLog('CHAT', 'Building prompt...');
			const currentWorkflowCode = payload.workflowContext?.currentWorkflow
				? this.workflowToCode(payload.workflowContext.currentWorkflow)
				: undefined;

			if (currentWorkflowCode) {
				debugLog('CHAT', 'Current workflow context provided', {
					currentWorkflowCodeLength: currentWorkflowCode.length,
					currentWorkflowCodePreview: currentWorkflowCode.substring(0, 500),
				});
			}

			const prompt = this.buildPrompt(currentWorkflowCode);
			debugLog('CHAT', 'Prompt built successfully');

			// Bind tools to LLM
			debugLog('CHAT', 'Binding tools to LLM...');
			if (!this.llm.bindTools) {
				throw new Error('LLM does not support bindTools - cannot use tools for node discovery');
			}
			const llmWithTools = this.llm.bindTools(this.tools);
			debugLog('CHAT', 'Tools bound to LLM');

			// Format initial messages
			debugLog('CHAT', 'Formatting initial messages...');
			const formattedMessages = await prompt.formatMessages({ userMessage: payload.message });
			const messages: BaseMessage[] = [...formattedMessages];
			debugLog('CHAT', 'Initial messages formatted', {
				messageCount: messages.length,
			});

			// Run agentic loop
			debugLog('CHAT', 'Starting agentic loop...');
			let iteration = 0;
			let finalResult: WorkflowCodeOutput | null = null;
			let totalInputTokens = 0;
			let totalOutputTokens = 0;
			let consecutiveParseErrors = 0;
			let workflow: WorkflowJSON | null = null;
			let parseDuration = 0;
			let sourceCode: string | null = null;
			const generationErrors: StreamGenerationError[] = [];

			while (iteration < MAX_AGENT_ITERATIONS) {
				if (consecutiveParseErrors >= 3) {
					// Two consecutive parsing errors - fail
					debugLog('CHAT', 'Three consecutive parsing errors - failing');
					throw new Error('Failed to parse workflow code after 3 consecutive attempts.');
				}

				iteration++;
				debugLog('CHAT', `========== ITERATION ${iteration} ==========`);

				// Check for abort
				if (abortSignal?.aborted) {
					debugLog('CHAT', 'Abort signal received');
					throw new Error('Aborted');
				}

				// Invoke LLM
				debugLog('CHAT', 'Invoking LLM...');
				const llmStartTime = Date.now();
				const response = await llmWithTools.invoke(messages, { signal: abortSignal });
				const llmDuration = Date.now() - llmStartTime;
				// Extract token usage from response metadata
				const responseMetadata = response.response_metadata as
					| { usage?: { input_tokens?: number; output_tokens?: number } }
					| undefined;
				const inputTokens = responseMetadata?.usage?.input_tokens ?? 0;
				const outputTokens = responseMetadata?.usage?.output_tokens ?? 0;
				totalInputTokens += inputTokens;
				totalOutputTokens += outputTokens;

				debugLog('CHAT', 'LLM response received', {
					llmDurationMs: llmDuration,
					responseId: response.id,
					hasToolCalls: response.tool_calls && response.tool_calls.length > 0,
					toolCallCount: response.tool_calls?.length ?? 0,
					inputTokens,
					outputTokens,
					totalInputTokens,
					totalOutputTokens,
				});

				// Extract text content from response
				const textContent = this.extractTextContent(response);
				if (textContent) {
					debugLog('CHAT', 'Streaming text response', { textContent });
					yield {
						messages: [
							{
								role: 'assistant',
								type: 'message',
								text: textContent,
							} as AgentMessageChunk,
						],
					};
				}

				// Add AI message to history
				messages.push(response);

				// Check if there are tool calls
				if (response.tool_calls && response.tool_calls.length > 0) {
					debugLog('CHAT', 'Processing tool calls...', {
						toolCalls: response.tool_calls.map((tc) => ({
							name: tc.name,
							id: tc.id ?? 'unknown',
						})),
					});

					// Reset consecutive parse errors on tool calls (agent is doing other work)
					consecutiveParseErrors = 0;

					// Execute tool calls and stream progress
					for (const toolCall of response.tool_calls) {
						// Skip tool calls without an ID (shouldn't happen but handle gracefully)
						if (!toolCall.id) {
							debugLog('CHAT', 'Skipping tool call without ID', { name: toolCall.name });
							continue;
						}
						yield* this.executeToolCall(
							{ name: toolCall.name, args: toolCall.args, id: toolCall.id },
							messages,
						);
					}
				} else {
					// No tool calls - try to parse as final response
					debugLog('CHAT', 'No tool calls, attempting to parse final response...');
					const parseResult = this.parseStructuredOutput(response);
					finalResult = parseResult.result;

					if (finalResult) {
						debugLog('CHAT', 'Final result parsed successfully', {
							workflowCodeLength: finalResult.workflowCode.length,
						});

						// Try to parse and validate the workflow code
						debugLog('CHAT', 'Parsing and validating workflow code...');
						debugLog('CHAT', 'Raw workflow code from LLM:', {
							workflowCode: finalResult.workflowCode,
						});
						const parseStartTime = Date.now();

						try {
							workflow = await this.parseAndValidate(finalResult.workflowCode);
							parseDuration = Date.now() - parseStartTime;
							sourceCode = finalResult.workflowCode; // Save for later use
							debugLog('CHAT', 'Workflow parsed and validated', {
								parseDurationMs: parseDuration,
								workflowId: workflow.id,
								workflowName: workflow.name,
								nodeCount: workflow.nodes.length,
								nodeTypes: workflow.nodes.map((n) => n.type),
							});

							// Run type checking on the generated code
							debugLog('CHAT', 'Running type check on generated code...');
							const typeCheckResult = typeCheckCode(finalResult.workflowCode);
							const criticalViolations = typeCheckResult.violations.filter(
								(v) => v.type === 'critical',
							);

							debugLog('CHAT', 'Type check complete', {
								score: typeCheckResult.score,
								totalViolations: typeCheckResult.violations.length,
								criticalViolations: criticalViolations.length,
							});

							// If there are critical type errors, send them back to the agent
							if (criticalViolations.length > 0 && consecutiveParseErrors < 2) {
								consecutiveParseErrors++;
								const typeErrorMessages = criticalViolations
									.slice(0, 5) // Limit to first 5 errors
									.map((v) => `- Line ${v.lineNumber ?? '?'}: ${v.description}`)
									.join('\n');

								// Track type errors
								generationErrors.push({
									message: `TypeScript errors:\n${typeErrorMessages}`,
									code: finalResult.workflowCode,
									iteration,
									type: 'typecheck',
								});

								debugLog('CHAT', 'Critical type errors found, sending back to agent', {
									errorCount: criticalViolations.length,
								});

								messages.push(
									new HumanMessage(
										`The workflow code has TypeScript type errors:\n\n${typeErrorMessages}\n\nPlease fix these errors and provide the corrected version as a JSON object with a workflowCode field.`,
									),
								);
								workflow = null; // Reset so we continue the loop
								finalResult = null;
								continue;
							}

							// Successfully parsed and type-checked - exit the loop
							break;
						} catch (parseError) {
							parseDuration = Date.now() - parseStartTime;
							consecutiveParseErrors++;
							const errorMessage =
								parseError instanceof Error ? parseError.message : String(parseError);

							// Track the generation error
							generationErrors.push({
								message: errorMessage,
								code: finalResult?.workflowCode,
								iteration,
								type: 'parse',
							});

							debugLog('CHAT', 'Workflow parsing failed', {
								parseDurationMs: parseDuration,
								consecutiveParseErrors,
								errorMessage,
							});

							// First parsing error - send error back to agent for correction
							debugLog('CHAT', 'First parsing error - sending error back to agent for correction');
							messages.push(
								new HumanMessage(
									`The workflow code you generated has a parsing error:\n\n${errorMessage}\n\nPlease fix the code and provide the corrected version as a JSON object with a workflowCode field.`,
								),
							);
							finalResult = null; // Reset so we can try again
						}
					} else {
						consecutiveParseErrors++;
						debugLog(
							'CHAT',
							'Could not parse structured output, continuing loop for another response...',
							{ parseError: parseResult.error },
						);
						// Add a follow-up message with the error to help the LLM correct its response
						messages.push(
							new HumanMessage(
								`Could not parse your response: ${parseResult.error}\n\nPlease provide your response as a JSON object with a workflowCode field containing the complete TypeScript SDK code.`,
							),
						);
					}
				}
			}

			if (!workflow) {
				throw new Error(
					`Failed to generate workflow after ${MAX_AGENT_ITERATIONS} iterations. The agent may be stuck in a tool-calling loop.`,
				);
			}

			const llmDuration = Date.now() - startTime;
			debugLog('CHAT', 'Agentic loop complete', {
				iterations: iteration,
				totalLlmDurationMs: llmDuration,
			});

			// Log success
			this.logger?.info('One-shot agent generated workflow', {
				userId,
				nodeCount: workflow.nodes.length,
				iterations: iteration,
			});

			// Calculate stats
			const totalDuration = Date.now() - startTime;
			const totalTokens = totalInputTokens + totalOutputTokens;
			const estimatedCost = calculateCost(totalInputTokens, totalOutputTokens);

			debugLog('CHAT', 'Request stats', {
				totalDurationMs: totalDuration,
				totalInputTokens,
				totalOutputTokens,
				totalTokens,
				estimatedCostUsd: estimatedCost,
			});

			// Stream stats message
			const statsMessage = `Generated workflow in ${formatDuration(totalDuration)} | ${totalTokens.toLocaleString()} tokens (${totalInputTokens.toLocaleString()} in, ${totalOutputTokens.toLocaleString()} out) | Est. cost: $${estimatedCost.toFixed(4)}`;
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: statsMessage,
					} as AgentMessageChunk,
				],
			};

			// Stream workflow update (includes source code for evaluation artifacts)
			debugLog('CHAT', 'Streaming workflow update');
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'workflow-updated',
						codeSnippet: JSON.stringify(workflow, null, 2),
						sourceCode: sourceCode ?? '',
						tokenUsage: {
							inputTokens: totalInputTokens,
							outputTokens: totalOutputTokens,
						},
						iterationCount: iteration,
						generationErrors: generationErrors.length > 0 ? generationErrors : undefined,
					} as WorkflowUpdateChunk,
				],
			};

			debugLog('CHAT', '========== CHAT COMPLETE ==========', {
				totalDurationMs: totalDuration,
				totalInputTokens,
				totalOutputTokens,
				estimatedCostUsd: estimatedCost,
				parseDurationMs: parseDuration,
				nodeCount: workflow.nodes.length,
				iterations: iteration,
			});
		} catch (error) {
			const totalDuration = Date.now() - startTime;
			debugLog('CHAT', '========== CHAT FAILED ==========', {
				totalDurationMs: totalDuration,
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
			});

			this.logger?.error('One-shot agent failed', {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Stream error message
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: `I encountered an error while generating the workflow: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your request.`,
					} as AgentMessageChunk,
				],
			};
		}
	}

	/**
	 * Extract text content from an AI message
	 */
	private extractTextContent(message: AIMessage): string | null {
		// Content can be a string or an array of content blocks
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
	 * Execute a tool call and yield progress updates
	 */
	private async *executeToolCall(
		toolCall: { name: string; args: Record<string, unknown>; id: string },
		messages: BaseMessage[],
	): AsyncGenerator<StreamOutput, void, unknown> {
		debugLog('TOOL_CALL', `Executing tool: ${toolCall.name}`, {
			toolCallId: toolCall.id,
			args: toolCall.args,
		});

		// Stream tool progress
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
			debugLog('TOOL_CALL', errorMessage);
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

			debugLog('TOOL_CALL', `Tool ${toolCall.name} completed`, {
				toolDurationMs: toolDuration,
				resultLength: typeof result === 'string' ? result.length : JSON.stringify(result).length,
				resultPreview:
					typeof result === 'string'
						? result.substring(0, 200)
						: JSON.stringify(result).substring(0, 200),
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
			debugLog('TOOL_CALL', `Tool ${toolCall.name} failed`, { error: errorMessage });

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

	/**
	 * Parse structured output from an AI message
	 * Returns object with result or error information
	 */
	private parseStructuredOutput(message: AIMessage): {
		result: WorkflowCodeOutput | null;
		error: string | null;
	} {
		const content = this.extractTextContent(message);
		if (!content) {
			debugLog('PARSE_OUTPUT', 'No text content to parse');
			return { result: null, error: 'No text content found in response' };
		}

		debugLog('PARSE_OUTPUT', 'Attempting to parse structured output', {
			contentLength: content.length,
			contentPreview: content.substring(0, 500),
		});

		// Try to extract JSON from the content
		// Look for JSON in code blocks or raw JSON
		const jsonMatch =
			content.match(/```json\s*([\s\S]*?)\s*```/) ||
			content.match(/```\s*([\s\S]*?)\s*```/) ||
			content.match(/(\{[\s\S]*"workflowCode"[\s\S]*\})/);

		if (!jsonMatch) {
			debugLog('PARSE_OUTPUT', 'No JSON found in content');
			return {
				result: null,
				error:
					'No JSON object with workflowCode field found in response. Please wrap your response in a JSON code block.',
			};
		}

		try {
			const jsonStr = jsonMatch[1].trim();
			const parsed = JSON.parse(jsonStr) as unknown;

			// Validate with Zod schema
			const result = WorkflowCodeOutputSchema.parse(parsed);
			debugLog('PARSE_OUTPUT', 'Successfully parsed structured output', {
				workflowCodeLength: result.workflowCode.length,
			});

			return { result, error: null };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			debugLog('PARSE_OUTPUT', 'Failed to parse JSON', {
				error: errorMessage,
			});
			return { result: null, error: `Failed to parse JSON: ${errorMessage}` };
		}
	}

	/**
	 * Build the system prompt with node IDs and SDK reference.
	 * Selects the appropriate prompt based on modelId:
	 * - 'claude-opus-4.5': Uses Opus prompt with full SDK reference
	 * - Other models: Uses Sonnet 4.5 optimized prompt (condensed, no SDK reference)
	 */
	private buildPrompt(currentWorkflow?: string) {
		debugLog('BUILD_PROMPT', 'Getting node IDs by category with discriminators...');
		const nodeIds = this.nodeTypeParser.getNodeIdsByCategoryWithDiscriminators();
		debugLog('BUILD_PROMPT', 'Node IDs retrieved', {
			triggerCount: nodeIds.triggers.length,
			coreCount: nodeIds.core.length,
			aiCount: nodeIds.ai.length,
			otherCount: nodeIds.other.length,
			triggersPreview: nodeIds.triggers.slice(0, 5).map((n) => n.id),
			corePreview: nodeIds.core.slice(0, 5).map((n) => n.id),
			aiPreview: nodeIds.ai.slice(0, 5).map((n) => n.id),
		});

		// Select prompt based on model
		const useOpusPrompt = this.modelId === 'claude-opus-4.5';
		debugLog('BUILD_PROMPT', 'Building prompt template...', {
			hasCurrentWorkflow: !!currentWorkflow,
			sdkSourceCodeLength: this.sdkSourceCode.length,
			modelId: this.modelId,
			promptType: useOpusPrompt ? 'opus' : 'sonnet',
		});

		const prompt = useOpusPrompt
			? buildOpusOneShotGeneratorPrompt(nodeIds, this.sdkSourceCode, currentWorkflow)
			: buildOneShotGeneratorPrompt(nodeIds, this.sdkSourceCode, currentWorkflow);

		debugLog('BUILD_PROMPT', 'Prompt template built', {
			promptType: useOpusPrompt ? 'opus (with SDK reference)' : 'sonnet (optimized)',
		});
		return prompt;
	}

	/**
	 * Parse TypeScript code to WorkflowJSON and validate
	 */
	private async parseAndValidate(code: string): Promise<WorkflowJSON> {
		debugLog('PARSE_VALIDATE', '========== PARSING WORKFLOW CODE ==========');
		debugLog('PARSE_VALIDATE', 'Input code', {
			codeLength: code.length,
			codePreview: code.substring(0, 500),
			codeEnd: code.substring(Math.max(0, code.length - 500)),
		});

		try {
			// Parse the TypeScript code
			this.logger?.debug('Parsing WorkflowCode', { codeLength: code.length });
			debugLog('PARSE_VALIDATE', 'Calling parseWorkflowCode...');
			const parseStartTime = Date.now();
			const workflow = parseWorkflowCode(code);
			const parseDuration = Date.now() - parseStartTime;

			debugLog('PARSE_VALIDATE', 'Workflow parsed successfully', {
				parseDurationMs: parseDuration,
				workflowId: workflow.id,
				workflowName: workflow.name,
				nodeCount: workflow.nodes.length,
				connectionCount: Object.keys(workflow.connections).length,
			});

			// Log each node
			debugLog('PARSE_VALIDATE', 'Parsed nodes', {
				nodes: workflow.nodes.map((n) => ({
					id: n.id,
					name: n.name,
					type: n.type,
					position: n.position,
					parametersKeys: n.parameters ? Object.keys(n.parameters) : [],
				})),
			});

			// Log connections
			debugLog('PARSE_VALIDATE', 'Parsed connections', {
				connections: workflow.connections,
			});

			this.logger?.debug('Parsed workflow', {
				id: workflow.id,
				name: workflow.name,
				nodeCount: workflow.nodes.length,
			});

			// Validate (but don't fail on warnings)
			debugLog('PARSE_VALIDATE', 'Validating workflow...');
			const validateStartTime = Date.now();
			const validationResult = validateWorkflow(workflow);
			const validateDuration = Date.now() - validateStartTime;

			debugLog('PARSE_VALIDATE', 'Validation complete', {
				validateDurationMs: validateDuration,
				isValid: validationResult.valid,
				errorCount: validationResult.errors.length,
				warningCount: validationResult.warnings.length,
			});

			if (validationResult.errors.length > 0) {
				debugLog('PARSE_VALIDATE', 'VALIDATION ERRORS', {
					errors: validationResult.errors.map((e: { message: string; code?: string }) => ({
						message: e.message,
						code: e.code,
					})),
				});
				this.logger?.warn('Workflow validation errors', {
					errors: validationResult.errors.map((e: { message: string }) => e.message),
				});
			}

			if (validationResult.warnings.length > 0) {
				debugLog('PARSE_VALIDATE', 'VALIDATION WARNINGS', {
					warnings: validationResult.warnings.map((w: { message: string; code?: string }) => ({
						message: w.message,
						code: w.code,
					})),
				});
				this.logger?.info('Workflow validation warnings', {
					warnings: validationResult.warnings.map((w: { message: string }) => w.message),
				});
			}

			// Log full workflow JSON
			debugLog('PARSE_VALIDATE', 'Final workflow JSON', {
				workflow: JSON.stringify(workflow, null, 2),
			});

			debugLog('PARSE_VALIDATE', '========== PARSING COMPLETE ==========');

			// Always return the workflow, even with validation issues
			// The frontend can handle warnings, and errors are often false positives
			return workflow;
		} catch (error) {
			debugLog('PARSE_VALIDATE', '========== PARSING FAILED ==========', {
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
				code: code,
			});

			this.logger?.error('Failed to parse WorkflowCode', {
				error: error instanceof Error ? error.message : String(error),
				code: code.substring(0, 500), // Log first 500 chars
			});

			// Retry once with error feedback
			throw new Error(
				`Failed to parse generated workflow code: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Convert partial workflow JSON to TypeScript code (for context)
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private workflowToCode(workflow: Partial<Record<string, unknown>>): string {
		debugLog('WORKFLOW_TO_CODE', 'Converting workflow to code', {
			workflowKeys: Object.keys(workflow),
		});
		// For now, just stringify the workflow
		// In the future, could use generateWorkflowCode from workflow-sdk
		const code = JSON.stringify(workflow, null, 2);
		debugLog('WORKFLOW_TO_CODE', 'Workflow converted', {
			codeLength: code.length,
		});
		return code;
	}
}
