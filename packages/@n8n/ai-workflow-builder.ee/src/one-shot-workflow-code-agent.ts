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
import { parseWorkflowCodeToBuilder, validateWorkflow, SDK_API_CONTENT } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

// TODO: Re-enable when we decide on TypeScript runtime strategy (adds 23MB + 17MB memory)
// import { typeCheckCode } from './evaluators/code-typecheck/type-checker';

import { extractWorkflowCode } from './utils/extract-code';
import { NodeTypeParser } from './utils/node-type-parser';
import {
	PROMPT_VERSIONS,
	DEFAULT_PROMPT_VERSION,
	type PromptVersionId,
	type PromptVersionDefinition,
} from './prompts/one-shot';
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
 * Get the SDK API reference for the prompt.
 * Uses SDK_API_CONTENT which is embedded at build time to avoid disk reads.
 * Contains only what the LLM needs to generate workflow code.
 */
function getSdkSourceCode(): string {
	return SDK_API_CONTENT;
}

/**
 * Structured output type for the LLM response
 */
interface WorkflowCodeOutput {
	workflowCode: string;
}

/**
 * Result from parseAndValidate including workflow and any warnings
 */
interface ParseAndValidateResult {
	workflow: WorkflowJSON;
	warnings: Array<{ code: string; message: string; nodeName?: string }>;
}

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
	 * Optional model ID to select the appropriate prompt when promptVersion is not specified.
	 * - 'claude-opus-4.5': Uses the Opus 4.5 prompt with full SDK reference
	 * - Other models: Uses the Sonnet 4.5 optimized prompt (condensed, no SDK reference)
	 */
	modelId?: ModelId;
	/**
	 * Optional prompt version to use. If specified, overrides model-based selection.
	 * - 'v1-sonnet': Condensed prompt optimized for Sonnet 4.5
	 * - 'v2-opus': Comprehensive prompt with full SDK reference for Opus 4.5
	 */
	promptVersion?: PromptVersionId;
	/**
	 * Enable log capture for later retrieval (e.g., for evaluation artifacts).
	 * When true, all debug logs will be captured and can be retrieved via getCapturedLogs().
	 */
	captureLog?: boolean;
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
	private promptVersion: PromptVersionId;
	private promptDefinition: PromptVersionDefinition;
	private capturedLogs: string[] = [];
	private shouldCaptureLog: boolean;

	constructor(config: OneShotWorkflowCodeAgentConfig) {
		this.shouldCaptureLog = config.captureLog ?? false;
		this.debugLog('CONSTRUCTOR', 'Initializing OneShotWorkflowCodeAgent...', {
			nodeTypesCount: config.nodeTypes.length,
			hasLogger: !!config.logger,
			modelId: config.modelId,
			promptVersion: config.promptVersion,
		});
		this.llm = config.llm;
		this.nodeTypeParser = new NodeTypeParser(config.nodeTypes);
		this.logger = config.logger;
		this.sdkSourceCode = getSdkSourceCode();
		this.debugLog('INIT', 'Using embedded SDK API content', {
			contentLength: this.sdkSourceCode.length,
		});
		this.modelId = config.modelId;

		// Determine prompt version: explicit > model-based fallback > default
		this.promptVersion = config.promptVersion ?? this.getDefaultPromptVersionForModel();
		this.promptDefinition = PROMPT_VERSIONS[this.promptVersion];

		// Create tools
		const searchTool = createOneShotNodeSearchTool(this.nodeTypeParser);
		const getTool = createOneShotNodeGetTool({ generatedTypesDir: config.generatedTypesDir });
		this.tools = [searchTool, getTool];
		this.toolsMap = new Map(this.tools.map((t) => [t.name, t]));

		this.debugLog('CONSTRUCTOR', 'OneShotWorkflowCodeAgent initialized', {
			sdkSourceCodeLength: this.sdkSourceCode.length,
			toolNames: this.tools.map((t) => t.name),
			promptVersion: this.promptVersion,
			promptName: this.promptDefinition.name,
		});
	}

	/**
	 * Debug logging helper - logs to console with timestamp and prefix.
	 * Uses util.inspect for terminal-friendly output with full depth.
	 * Optionally captures logs for later retrieval when captureLog is enabled.
	 */
	private debugLog(context: string, message: string, data?: Record<string, unknown>): void {
		const timestamp = new Date().toISOString();
		const prefix = `[ONE-SHOT-AGENT][${timestamp}][${context}]`;

		if (data) {
			// Console output (with colors)
			const colorFormatted = inspect(data, {
				depth: null,
				colors: true,
				maxStringLength: null,
				maxArrayLength: null,
				breakLength: 120,
			});
			console.log(`${prefix} ${message}\n${colorFormatted}`);

			// Capture for file output (without colors)
			if (this.shouldCaptureLog) {
				const plainFormatted = inspect(data, {
					depth: null,
					colors: false,
					maxStringLength: null,
					maxArrayLength: null,
					breakLength: 120,
				});
				this.capturedLogs.push(`${prefix} ${message}\n${plainFormatted}`);
			}
		} else {
			console.log(`${prefix} ${message}`);
			if (this.shouldCaptureLog) {
				this.capturedLogs.push(`${prefix} ${message}`);
			}
		}
	}

	/**
	 * Get the captured logs as a single string.
	 * Only populated when captureLog is enabled in the config.
	 */
	public getCapturedLogs(): string {
		return this.capturedLogs.join('\n');
	}

	/**
	 * Get the default prompt version based on the model ID.
	 * Opus uses v2-opus, all other models use v1-sonnet.
	 */
	private getDefaultPromptVersionForModel(): PromptVersionId {
		if (this.modelId === 'claude-opus-4.5') {
			return 'v2-opus';
		}
		return DEFAULT_PROMPT_VERSION;
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
		this.debugLog('CHAT', '========== STARTING CHAT ==========');
		this.debugLog('CHAT', 'Input payload', {
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
			this.debugLog('CHAT', 'Building prompt...');
			const currentWorkflow = payload.workflowContext?.currentWorkflow as WorkflowJSON | undefined;

			if (currentWorkflow) {
				this.debugLog('CHAT', 'Current workflow context provided', {
					workflowId: currentWorkflow.id,
					workflowName: currentWorkflow.name,
					nodeCount: currentWorkflow.nodes?.length ?? 0,
				});
			}

			const prompt = this.buildPrompt(currentWorkflow);
			this.debugLog('CHAT', 'Prompt built successfully');

			// Bind tools to LLM
			this.debugLog('CHAT', 'Binding tools to LLM...');
			if (!this.llm.bindTools) {
				throw new Error('LLM does not support bindTools - cannot use tools for node discovery');
			}
			const llmWithTools = this.llm.bindTools(this.tools);
			this.debugLog('CHAT', 'Tools bound to LLM');

			// Format initial messages
			this.debugLog('CHAT', 'Formatting initial messages...');
			const formattedMessages = await prompt.formatMessages({ userMessage: payload.message });
			const messages: BaseMessage[] = [...formattedMessages];
			this.debugLog('CHAT', 'Initial messages formatted', {
				messageCount: messages.length,
			});

			// Run agentic loop
			this.debugLog('CHAT', 'Starting agentic loop...');
			let iteration = 0;
			let finalResult: WorkflowCodeOutput | null = null;
			let totalInputTokens = 0;
			let totalOutputTokens = 0;
			let consecutiveParseErrors = 0;
			let workflow: WorkflowJSON | null = null;
			let parseDuration = 0;
			let sourceCode: string | null = null;
			const generationErrors: StreamGenerationError[] = [];
			// Track warning codes that have been sent to agent (to avoid repeating)
			const previousWarningCodes = new Set<string>();

			while (iteration < MAX_AGENT_ITERATIONS) {
				if (consecutiveParseErrors >= 3) {
					// Two consecutive parsing errors - fail
					this.debugLog('CHAT', 'Three consecutive parsing errors - failing');
					throw new Error('Failed to parse workflow code after 3 consecutive attempts.');
				}

				iteration++;
				this.debugLog('CHAT', `========== ITERATION ${iteration} ==========`);

				// Check for abort
				if (abortSignal?.aborted) {
					this.debugLog('CHAT', 'Abort signal received');
					throw new Error('Aborted');
				}

				// Invoke LLM
				this.debugLog('CHAT', 'Invoking LLM...');
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

				this.debugLog('CHAT', 'LLM response received', {
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
					this.debugLog('CHAT', 'Streaming text response', { textContent });
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
					this.debugLog('CHAT', 'Processing tool calls...', {
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
							this.debugLog('CHAT', 'Skipping tool call without ID', { name: toolCall.name });
							continue;
						}
						yield* this.executeToolCall(
							{ name: toolCall.name, args: toolCall.args, id: toolCall.id },
							messages,
						);
					}
				} else {
					// No tool calls - try to parse as final response
					this.debugLog('CHAT', 'No tool calls, attempting to parse final response...');
					const parseResult = this.parseStructuredOutput(response);
					finalResult = parseResult.result;

					if (finalResult) {
						this.debugLog('CHAT', 'Final result parsed successfully', {
							workflowCodeLength: finalResult.workflowCode.length,
						});

						// Try to parse and validate the workflow code
						this.debugLog('CHAT', 'Parsing and validating workflow code...');
						this.debugLog('CHAT', 'Raw workflow code from LLM:', {
							workflowCode: finalResult.workflowCode,
						});
						const parseStartTime = Date.now();

						try {
							const result = await this.parseAndValidate(finalResult.workflowCode);
							workflow = result.workflow;
							parseDuration = Date.now() - parseStartTime;
							sourceCode = finalResult.workflowCode; // Save for later use
							this.debugLog('CHAT', 'Workflow parsed and validated', {
								parseDurationMs: parseDuration,
								workflowId: workflow.id,
								workflowName: workflow.name,
								nodeCount: workflow.nodes.length,
								nodeTypes: workflow.nodes.map((n) => n.type),
								warningCount: result.warnings.length,
							});

							// Check for new warnings that haven't been sent to agent before
							const newWarnings = result.warnings.filter(
								(w) => !previousWarningCodes.has(`${w.code}:${w.message}`),
							);

							if (newWarnings.length > 0) {
								this.debugLog('CHAT', 'New validation warnings found', {
									newWarningCount: newWarnings.length,
									newWarningCodes: newWarnings.map((w) => w.code),
								});

								// Mark these warnings as sent (so we don't repeat)
								for (const w of newWarnings) {
									previousWarningCodes.add(`${w.code}:${w.message}`);
								}

								// Format warnings for the agent
								const warningMessages = newWarnings
									.slice(0, 5) // Limit to first 5 warnings
									.map((w) => `- [${w.code}] ${w.message}`)
									.join('\n');

								// Track as generation error for artifacts
								generationErrors.push({
									message: `Validation warnings:\n${warningMessages}`,
									code: finalResult.workflowCode,
									iteration,
									type: 'validation',
								});

								// Send warnings back to agent for one correction attempt
								messages.push(
									new HumanMessage(
										`The workflow code has validation warnings that should be addressed:\n\n${warningMessages}\n\nPlease fix these issues and provide the corrected version in a \`\`\`typescript code block.`,
									),
								);
								workflow = null; // Reset so we continue the loop
								finalResult = null;
								continue;
							}

							// No new warnings (or all are repeats) - successfully parsed, exit the loop
							this.debugLog('CHAT', 'No new warnings, accepting workflow');
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

							this.debugLog('CHAT', 'Workflow parsing failed', {
								parseDurationMs: parseDuration,
								consecutiveParseErrors,
								errorMessage,
							});

							// First parsing error - send error back to agent for correction
							this.debugLog(
								'CHAT',
								'First parsing error - sending error back to agent for correction',
							);
							messages.push(
								new HumanMessage(
									`The workflow code you generated has a parsing error:\n\n${errorMessage}\n\nPlease fix the code and provide the corrected version in a \`\`\`typescript code block.`,
								),
							);
							finalResult = null; // Reset so we can try again
						}
					} else {
						consecutiveParseErrors++;
						this.debugLog(
							'CHAT',
							'Could not parse structured output, continuing loop for another response...',
							{ parseError: parseResult.error },
						);
						// Add a follow-up message with the error to help the LLM correct its response
						messages.push(
							new HumanMessage(
								`Could not parse your response: ${parseResult.error}\n\nPlease provide your workflow code in a \`\`\`typescript code block.`,
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
			this.debugLog('CHAT', 'Agentic loop complete', {
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

			this.debugLog('CHAT', 'Request stats', {
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
			this.debugLog('CHAT', 'Streaming workflow update');
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

			this.debugLog('CHAT', '========== CHAT COMPLETE ==========', {
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
			this.debugLog('CHAT', '========== CHAT FAILED ==========', {
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
		this.debugLog('TOOL_CALL', `Executing tool: ${toolCall.name}`, {
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
				result: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
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

	/**
	 * Parse structured output from an AI message
	 * Extracts workflow code from TypeScript code blocks
	 * Returns object with result or error information
	 */
	private parseStructuredOutput(message: AIMessage): {
		result: WorkflowCodeOutput | null;
		error: string | null;
	} {
		const content = this.extractTextContent(message);
		if (!content) {
			this.debugLog('PARSE_OUTPUT', 'No text content to parse');
			return { result: null, error: 'No text content found in response' };
		}

		this.debugLog('PARSE_OUTPUT', 'Attempting to extract workflow code', {
			contentLength: content.length,
			contentPreview: content.substring(0, 500),
		});

		// Extract code from TypeScript code blocks
		const workflowCode = extractWorkflowCode(content);

		// Check if we got valid code (should contain workflow-related keywords)
		if (!workflowCode || !workflowCode.includes('workflow')) {
			this.debugLog('PARSE_OUTPUT', 'No valid workflow code found in content');
			return {
				result: null,
				error:
					'No valid workflow code found in response. Please provide your code in a ```typescript code block.',
			};
		}

		this.debugLog('PARSE_OUTPUT', 'Successfully extracted workflow code', {
			workflowCodeLength: workflowCode.length,
		});

		return { result: { workflowCode }, error: null };
	}

	/**
	 * Build the system prompt with node IDs and SDK reference.
	 * Builds the prompt using the configured prompt version from the registry.
	 */
	private buildPrompt(currentWorkflow?: WorkflowJSON) {
		this.debugLog('BUILD_PROMPT', 'Getting node IDs by category with discriminators...');
		const nodeIds = this.nodeTypeParser.getNodeIdsByCategoryWithDiscriminators();
		this.debugLog('BUILD_PROMPT', 'Node IDs retrieved', {
			triggerCount: nodeIds.triggers.length,
			coreCount: nodeIds.core.length,
			aiCount: nodeIds.ai.length,
			otherCount: nodeIds.other.length,
			triggersPreview: nodeIds.triggers.slice(0, 5).map((n) => n.id),
			corePreview: nodeIds.core.slice(0, 5).map((n) => n.id),
			aiPreview: nodeIds.ai.slice(0, 5).map((n) => n.id),
		});

		this.debugLog('BUILD_PROMPT', 'Building prompt template...', {
			hasCurrentWorkflow: !!currentWorkflow,
			sdkSourceCodeLength: this.sdkSourceCode.length,
			modelId: this.modelId,
			promptVersion: this.promptVersion,
			promptName: this.promptDefinition.name,
		});

		const prompt = this.promptDefinition.buildPrompt(nodeIds, this.sdkSourceCode, currentWorkflow);

		this.debugLog('BUILD_PROMPT', 'Prompt template built', {
			promptVersion: this.promptVersion,
			promptName: this.promptDefinition.name,
		});
		return prompt;
	}

	/**
	 * Parse TypeScript code to WorkflowJSON and validate
	 * Returns both the workflow and any validation warnings
	 */
	private async parseAndValidate(code: string): Promise<ParseAndValidateResult> {
		this.debugLog('PARSE_VALIDATE', '========== PARSING WORKFLOW CODE ==========');
		this.debugLog('PARSE_VALIDATE', 'Input code', {
			codeLength: code.length,
			codePreview: code.substring(0, 500),
			codeEnd: code.substring(Math.max(0, code.length - 500)),
		});

		try {
			// Parse the TypeScript code to WorkflowBuilder
			this.logger?.debug('Parsing WorkflowCode', { codeLength: code.length });
			this.debugLog('PARSE_VALIDATE', 'Calling parseWorkflowCodeToBuilder...');
			const parseStartTime = Date.now();
			const builder = parseWorkflowCodeToBuilder(code);
			const parseDuration = Date.now() - parseStartTime;

			this.debugLog('PARSE_VALIDATE', 'Code parsed to builder', {
				parseDurationMs: parseDuration,
			});

			// Validate the graph structure BEFORE converting to JSON
			this.debugLog('PARSE_VALIDATE', 'Validating graph structure...');
			const graphValidateStartTime = Date.now();
			const graphValidation = builder.validate();
			const graphValidateDuration = Date.now() - graphValidateStartTime;

			this.debugLog('PARSE_VALIDATE', 'Graph validation complete', {
				validateDurationMs: graphValidateDuration,
				isValid: graphValidation.valid,
				errorCount: graphValidation.errors.length,
				warningCount: graphValidation.warnings.length,
			});

			// If there are graph validation errors, throw to trigger self-correction
			if (graphValidation.errors.length > 0) {
				const errorMessages = graphValidation.errors
					.map((e: { message: string; code?: string }) => `[${e.code}] ${e.message}`)
					.join('\n');
				this.debugLog('PARSE_VALIDATE', 'GRAPH VALIDATION ERRORS', {
					errors: graphValidation.errors.map((e: { message: string; code?: string }) => ({
						message: e.message,
						code: e.code,
					})),
				});
				throw new Error(`Graph validation errors:\n${errorMessages}`);
			}

			// Collect all warnings (graph validation)
			const allWarnings: Array<{ code: string; message: string; nodeName?: string }> = [];

			// Log warnings (but don't fail on them)
			if (graphValidation.warnings.length > 0) {
				this.debugLog('PARSE_VALIDATE', 'GRAPH VALIDATION WARNINGS', {
					warnings: graphValidation.warnings.map((w: { message: string; code?: string }) => ({
						message: w.message,
						code: w.code,
					})),
				});
				this.logger?.info('Graph validation warnings', {
					warnings: graphValidation.warnings.map((w: { message: string }) => w.message),
				});
				// Add to all warnings
				for (const w of graphValidation.warnings) {
					allWarnings.push({
						code: w.code,
						message: w.message,
						nodeName: w.nodeName,
					});
				}
			}

			// Convert to JSON
			this.debugLog('PARSE_VALIDATE', 'Converting to JSON...');
			const workflow: WorkflowJSON = builder.toJSON();

			this.debugLog('PARSE_VALIDATE', 'Workflow converted to JSON', {
				workflowId: workflow.id,
				workflowName: workflow.name,
				nodeCount: workflow.nodes.length,
				connectionCount: Object.keys(workflow.connections).length,
			});

			// Log each node
			this.debugLog('PARSE_VALIDATE', 'Parsed nodes', {
				nodes: workflow.nodes.map((n) => ({
					id: n.id,
					name: n.name,
					type: n.type,
					position: n.position,
					parametersKeys: n.parameters ? Object.keys(n.parameters) : [],
				})),
			});

			// Log connections
			this.debugLog('PARSE_VALIDATE', 'Parsed connections', {
				connections: workflow.connections,
			});

			this.logger?.debug('Parsed workflow', {
				id: workflow.id,
				name: workflow.name,
				nodeCount: workflow.nodes.length,
			});

			// Also run JSON-based validation for additional checks
			this.debugLog('PARSE_VALIDATE', 'Running JSON validation...');
			const validateStartTime = Date.now();
			const validationResult = validateWorkflow(workflow);
			const validateDuration = Date.now() - validateStartTime;

			this.debugLog('PARSE_VALIDATE', 'JSON validation complete', {
				validateDurationMs: validateDuration,
				isValid: validationResult.valid,
				errorCount: validationResult.errors.length,
				warningCount: validationResult.warnings.length,
			});

			if (validationResult.errors.length > 0) {
				this.debugLog('PARSE_VALIDATE', 'JSON VALIDATION ERRORS', {
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
				this.debugLog('PARSE_VALIDATE', 'JSON VALIDATION WARNINGS', {
					warnings: validationResult.warnings.map((w: { message: string; code?: string }) => ({
						message: w.message,
						code: w.code,
					})),
				});
				this.logger?.info('Workflow validation warnings', {
					warnings: validationResult.warnings.map((w: { message: string }) => w.message),
				});
				// Add JSON validation warnings to allWarnings for agent self-correction
				for (const w of validationResult.warnings) {
					allWarnings.push({
						code: w.code,
						message: w.message,
						nodeName: w.nodeName,
					});
				}
			}

			// Log full workflow JSON
			this.debugLog('PARSE_VALIDATE', 'Final workflow JSON', {
				workflow: JSON.stringify(workflow, null, 2),
			});

			this.debugLog('PARSE_VALIDATE', '========== PARSING COMPLETE ==========');

			// Return both workflow and warnings for agent self-correction
			return { workflow, warnings: allWarnings };
		} catch (error) {
			this.debugLog('PARSE_VALIDATE', '========== PARSING FAILED ==========', {
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
}
