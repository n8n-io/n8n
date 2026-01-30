/**
 * Coding Agent
 *
 * LLM agent that generates TypeScript SDK code by:
 * 1. Receiving a markdown plan from the planning agent
 * 2. Looking up node details using get_node_details tool
 * 3. Generating TypeScript code that follows the plan
 * 4. Parsing and validating the generated code
 *
 * This is a focused code generator - it doesn't do discovery or planning.
 * Refactored from one-shot-workflow-code-agent.ts.
 */

import { inspect } from 'node:util';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { parseWorkflowCodeToBuilder, validateWorkflow } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { buildCodingAgentPrompt } from './prompts/coding';
import { createOneShotNodeGetTool } from './tools/one-shot-node-get.tool';
import { extractWorkflowCode } from './utils/extract-code';
import type {
	StreamOutput,
	AgentMessageChunk,
	ToolProgressChunk,
	WorkflowUpdateChunk,
	StreamGenerationError,
} from './types/streaming';

/** Maximum iterations for the coding agent loop */
const MAX_CODING_ITERATIONS = 15;

/**
 * Result from parseAndValidate including workflow and any warnings
 */
interface ParseAndValidateResult {
	workflow: WorkflowJSON;
	warnings: Array<{ code: string; message: string; nodeName?: string }>;
}

/**
 * Configuration for the coding agent
 */
export interface CodingAgentConfig {
	/** LLM for code generation */
	llm: BaseChatModel;
	/** Optional logger */
	logger?: Logger;
	/**
	 * Path to the generated types directory (from InstanceSettings.generatedTypesDir).
	 * If not provided, falls back to workflow-sdk static types.
	 */
	generatedTypesDir?: string;
}

/**
 * Coding Agent
 *
 * Generates TypeScript SDK code based on a plan from the planning agent.
 */
export class CodingAgent {
	private llm: BaseChatModel;
	private logger?: Logger;
	private tools: StructuredToolInterface[];
	private toolsMap: Map<string, StructuredToolInterface>;

	constructor(config: CodingAgentConfig) {
		this.llm = config.llm;
		this.logger = config.logger;

		// Create tools for the coding agent
		const getTool = createOneShotNodeGetTool({ generatedTypesDir: config.generatedTypesDir });
		this.tools = [getTool];
		this.toolsMap = new Map(this.tools.map((t) => [t.name, t]));

		this.debugLog('CONSTRUCTOR', 'CodingAgent initialized', {
			toolNames: this.tools.map((t) => t.name),
		});
	}

	/**
	 * Debug logging helper
	 */
	private debugLog(context: string, message: string, data?: Record<string, unknown>): void {
		const timestamp = new Date().toISOString();
		const prefix = `[CODING-AGENT][${timestamp}][${context}]`;

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
	 * Run the coding agent to generate workflow code
	 *
	 * @param plan - The markdown plan from the planning agent
	 * @param currentWorkflow - Optional existing workflow for context
	 * @param abortSignal - Optional abort signal
	 * @yields StreamOutput chunks for messages, tool progress, and workflow updates
	 */
	async *run(
		plan: string,
		currentWorkflow?: WorkflowJSON,
		abortSignal?: AbortSignal,
	): AsyncGenerator<StreamOutput, void, unknown> {
		const startTime = Date.now();
		this.debugLog('RUN', '========== CODING AGENT STARTING ==========');
		this.debugLog('RUN', 'Input', {
			planLength: plan.length,
			planPreview: plan.substring(0, 500),
			hasCurrentWorkflow: !!currentWorkflow,
		});

		try {
			// Build prompt with plan
			const prompt = buildCodingAgentPrompt(plan, currentWorkflow);

			// Bind tools to LLM
			if (!this.llm.bindTools) {
				throw new Error('LLM does not support bindTools');
			}
			const llmWithTools = this.llm.bindTools(this.tools);

			// Format initial messages (empty user message since plan is in the prompt)
			const formattedMessages = await prompt.formatMessages({});
			const messages: BaseMessage[] = [...formattedMessages];

			// Run agentic loop
			let iteration = 0;
			let workflow: WorkflowJSON | null = null;
			let sourceCode: string | null = null;
			let totalInputTokens = 0;
			let totalOutputTokens = 0;
			let consecutiveParseErrors = 0;
			const generationErrors: StreamGenerationError[] = [];
			const previousWarningCodes = new Set<string>();

			while (iteration < MAX_CODING_ITERATIONS) {
				if (consecutiveParseErrors >= 3) {
					this.debugLog('RUN', 'Three consecutive parsing errors - failing');
					throw new Error('Failed to parse workflow code after 3 consecutive attempts.');
				}

				iteration++;
				this.debugLog('RUN', `========== ITERATION ${iteration} ==========`);

				// Check for abort
				if (abortSignal?.aborted) {
					this.debugLog('RUN', 'Abort signal received');
					throw new Error('Aborted');
				}

				// Invoke LLM
				this.debugLog('RUN', 'Invoking LLM...');
				const llmStartTime = Date.now();
				const response = await llmWithTools.invoke(messages, { signal: abortSignal });
				const llmDuration = Date.now() - llmStartTime;

				// Extract token usage
				const responseMetadata = response.response_metadata as
					| { usage?: { input_tokens?: number; output_tokens?: number } }
					| undefined;
				const inputTokens = responseMetadata?.usage?.input_tokens ?? 0;
				const outputTokens = responseMetadata?.usage?.output_tokens ?? 0;
				totalInputTokens += inputTokens;
				totalOutputTokens += outputTokens;

				this.debugLog('RUN', 'LLM response received', {
					llmDurationMs: llmDuration,
					hasToolCalls: response.tool_calls && response.tool_calls.length > 0,
					toolCallCount: response.tool_calls?.length ?? 0,
					inputTokens,
					outputTokens,
				});

				// Extract text content from response
				const textContent = this.extractTextContent(response);
				if (textContent) {
					this.debugLog('RUN', 'Streaming text response', {
						textContentLength: textContent.length,
					});
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
					this.debugLog('RUN', 'Processing tool calls...');

					// Reset consecutive parse errors on tool calls
					consecutiveParseErrors = 0;

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
					// No tool calls - try to parse as final code response
					this.debugLog('RUN', 'No tool calls, attempting to parse code...');

					if (!textContent) {
						consecutiveParseErrors++;
						messages.push(
							new HumanMessage('Please provide your workflow code in a ```typescript code block.'),
						);
						continue;
					}

					// Extract code from response
					const workflowCode = extractWorkflowCode(textContent);

					if (!workflowCode || !workflowCode.includes('workflow')) {
						consecutiveParseErrors++;
						this.debugLog('RUN', 'No valid workflow code found');
						messages.push(
							new HumanMessage(
								'No valid workflow code found. Please provide your code in a ```typescript code block with a return workflow(...) statement.',
							),
						);
						continue;
					}

					// Try to parse and validate
					this.debugLog('RUN', 'Parsing and validating workflow code...');
					const parseStartTime = Date.now();

					try {
						const result = await this.parseAndValidate(workflowCode);
						const parseDuration = Date.now() - parseStartTime;
						workflow = result.workflow;
						sourceCode = workflowCode;

						this.debugLog('RUN', 'Workflow parsed and validated', {
							parseDurationMs: parseDuration,
							workflowId: workflow.id,
							nodeCount: workflow.nodes.length,
							warningCount: result.warnings.length,
						});

						// Check for new warnings
						const newWarnings = result.warnings.filter(
							(w) => !previousWarningCodes.has(`${w.code}:${w.message}`),
						);

						if (newWarnings.length > 0) {
							this.debugLog('RUN', 'New validation warnings found', {
								newWarningCount: newWarnings.length,
							});

							// Mark warnings as sent
							for (const w of newWarnings) {
								previousWarningCodes.add(`${w.code}:${w.message}`);
							}

							// Format warnings for correction
							const warningMessages = newWarnings
								.slice(0, 5)
								.map((w) => `- [${w.code}] ${w.message}`)
								.join('\n');

							// Track as generation error
							generationErrors.push({
								message: `Validation warnings:\n${warningMessages}`,
								code: workflowCode,
								iteration,
								type: 'validation',
							});

							// Send warnings back for correction
							messages.push(
								new HumanMessage(
									`The workflow code has validation warnings that should be addressed:\n\n${warningMessages}\n\nPlease fix these issues and provide the corrected version in a \`\`\`typescript code block.`,
								),
							);
							workflow = null;
							continue;
						}

						// No new warnings - success!
						this.debugLog('RUN', 'No new warnings, accepting workflow');
						break;
					} catch (parseError) {
						consecutiveParseErrors++;
						const errorMessage =
							parseError instanceof Error ? parseError.message : String(parseError);

						generationErrors.push({
							message: errorMessage,
							code: workflowCode,
							iteration,
							type: 'parse',
						});

						this.debugLog('RUN', 'Workflow parsing failed', {
							consecutiveParseErrors,
							errorMessage,
						});

						messages.push(
							new HumanMessage(
								`The workflow code you generated has a parsing error:\n\n${errorMessage}\n\nPlease fix the code and provide the corrected version in a \`\`\`typescript code block.`,
							),
						);
					}
				}
			}

			if (!workflow) {
				throw new Error(`Failed to generate workflow after ${MAX_CODING_ITERATIONS} iterations.`);
			}

			// Stream workflow update
			const totalDuration = Date.now() - startTime;
			this.debugLog('RUN', 'Streaming workflow update', {
				totalDurationMs: totalDuration,
				nodeCount: workflow.nodes.length,
				iterations: iteration,
			});

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

			this.debugLog('RUN', '========== CODING AGENT COMPLETE ==========', {
				totalDurationMs: totalDuration,
				totalInputTokens,
				totalOutputTokens,
				nodeCount: workflow.nodes.length,
				iterations: iteration,
			});
		} catch (error) {
			const totalDuration = Date.now() - startTime;
			this.debugLog('RUN', '========== CODING AGENT FAILED ==========', {
				totalDurationMs: totalDuration,
				errorMessage: error instanceof Error ? error.message : String(error),
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
			});

			messages.push(
				new ToolMessage({
					tool_call_id: toolCall.id,
					content: typeof result === 'string' ? result : JSON.stringify(result),
				}),
			);

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
	 * Parse TypeScript code to WorkflowJSON and validate
	 */
	private async parseAndValidate(code: string): Promise<ParseAndValidateResult> {
		this.debugLog('PARSE_VALIDATE', 'Parsing workflow code...');

		// Parse the TypeScript code to WorkflowBuilder
		const builder = parseWorkflowCodeToBuilder(code);

		// Validate the graph structure
		const graphValidation = builder.validate();

		if (graphValidation.errors.length > 0) {
			const errorMessages = graphValidation.errors
				.map((e: { message: string; code?: string }) => `[${e.code}] ${e.message}`)
				.join('\n');
			throw new Error(`Graph validation errors:\n${errorMessages}`);
		}

		// Collect warnings
		const allWarnings: Array<{ code: string; message: string; nodeName?: string }> = [];

		for (const w of graphValidation.warnings) {
			allWarnings.push({
				code: w.code,
				message: w.message,
				nodeName: w.nodeName,
			});
		}

		// Convert to JSON
		const workflow: WorkflowJSON = builder.toJSON();

		// Run JSON-based validation
		const validationResult = validateWorkflow(workflow);

		if (validationResult.errors.length > 0) {
			this.logger?.warn('Workflow validation errors', {
				errors: validationResult.errors.map((e: { message: string }) => e.message),
			});
		}

		// Add JSON validation warnings
		for (const w of validationResult.warnings) {
			allWarnings.push({
				code: w.code,
				message: w.message,
				nodeName: w.nodeName,
			});
		}

		return { workflow, warnings: allWarnings };
	}
}
