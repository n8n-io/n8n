/**
 * Code Builder Agent
 *
 * Unified agent that generates complete workflows using TypeScript SDK format with an agentic loop
 * that handles tool calls for node discovery before producing the final workflow.
 *
 * This replaces the split Planning Agent + Coding Agent architecture by combining both
 * discovery and code generation in a single, context-preserving agent.
 */

import type { CallbackManagerForChainRun } from '@langchain/core/callbacks/manager';
import { CallbackManager } from '@langchain/core/callbacks/manager';
import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

import type {
	StreamOutput,
	AgentMessageChunk,
	WorkflowUpdateChunk,
	SessionMessagesChunk,
} from '../types/streaming';
import type { ChatPayload } from '../workflow-builder-agent';
import {
	CODE_BUILDER_GET_NODE_TYPES_TOOL,
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL,
	CODE_BUILDER_SEARCH_NODES_TOOL,
	MAX_AGENT_ITERATIONS,
	MAX_VALIDATE_ATTEMPTS,
} from './constants';
import { AgentIterationHandler } from './handlers/agent-iteration-handler';
import { AutoFinalizeHandler } from './handlers/auto-finalize-handler';
import { ChatSetupHandler, type LlmWithTools } from './handlers/chat-setup-handler';
import { FinalResponseHandler } from './handlers/final-response-handler';
import { ParseValidateHandler } from './handlers/parse-validate-handler';
import type { TextEditorHandler } from './handlers/text-editor-handler';
import type { TextEditorToolHandler } from './handlers/text-editor-tool-handler';
import { ToolDispatchHandler } from './handlers/tool-dispatch-handler';
import { ValidateToolHandler } from './handlers/validate-tool-handler';
import type { HistoryContext } from './prompts';
import { WarningTracker } from './state/warning-tracker';
import { createCodeBuilderGetTool } from './tools/code-builder-get.tool';
import { createCodeBuilderSearchTool } from './tools/code-builder-search.tool';
import { createGetSuggestedNodesTool } from './tools/get-suggested-nodes.tool';
import type { CodeBuilderAgentConfig, TokenUsage } from './types';
export type { CodeBuilderAgentConfig } from './types';
import { sanitizeLlmErrorMessage } from '../utils/error-sanitizer';
import { entryToString } from './utils/code-builder-session';
import { pushValidationFeedback } from './utils/content-extractors';
import { calculateNodeChanges } from './utils/node-diff';
import { NodeTypeParser } from './utils/node-type-parser';

/**
 * Code Builder Agent
 *
 * Generates workflows by:
 * 1. Building a comprehensive system prompt with workflow patterns
 * 2. Running an agentic loop that handles tool calls for node discovery
 * 3. Parsing the final TypeScript code to WorkflowJSON
 * 4. Validating and streaming the result
 */
export class CodeBuilderAgent {
	private nodeTypeParser: NodeTypeParser;
	private logger?: Logger;
	private tools: StructuredToolInterface[];
	private toolsMap: Map<string, StructuredToolInterface>;
	private parseValidateHandler: ParseValidateHandler;
	private autoFinalizeHandler: AutoFinalizeHandler;
	private validateToolHandler: ValidateToolHandler;
	private iterationHandler: AgentIterationHandler;
	private finalResponseHandler: FinalResponseHandler;
	private chatSetupHandler: ChatSetupHandler;
	private toolDispatchHandler: ToolDispatchHandler;
	/** Optional callback for emitting telemetry events */
	private onTelemetryEvent?: (event: string, properties: ITelemetryTrackProperties) => void;
	/** Token usage accumulator - tracks original callback and accumulated totals */
	private originalOnTokenUsage?: (usage: TokenUsage) => void;
	/** Accumulated token usage for the current chat session */
	private accumulatedTokens: { inputTokens: number; outputTokens: number; thinkingTokens: number } =
		{
			inputTokens: 0,
			outputTokens: 0,
			thinkingTokens: 0,
		};

	constructor(config: CodeBuilderAgentConfig) {
		this.nodeTypeParser = new NodeTypeParser(config.nodeTypes);
		this.logger = config.logger;
		this.onTelemetryEvent = config.onTelemetryEvent;
		this.originalOnTokenUsage = config.onTokenUsage;

		// Configure schema validator to search the same dirs as get_node_types
		if (config.nodeDefinitionDirs) {
			setSchemaBaseDirs(config.nodeDefinitionDirs);
		}

		this.parseValidateHandler = new ParseValidateHandler({
			logger: config.logger,
			generatePinData: config.generatePinData,
		});

		// Initialize auto-finalize handler
		this.autoFinalizeHandler = new AutoFinalizeHandler({
			parseAndValidate: async (code, currentWorkflow) =>
				await this.parseValidateHandler.parseAndValidate(code, currentWorkflow),
			getErrorContext: (code, errorMessage) =>
				this.parseValidateHandler.getErrorContext(code, errorMessage),
		});

		// Initialize validate tool handler
		this.validateToolHandler = new ValidateToolHandler({
			parseAndValidate: async (code, currentWorkflow) =>
				await this.parseValidateHandler.parseAndValidate(code, currentWorkflow),
			getErrorContext: (code, errorMessage) =>
				this.parseValidateHandler.getErrorContext(code, errorMessage),
		});

		// Initialize iteration handler with wrapped token callback that accumulates totals
		this.iterationHandler = new AgentIterationHandler({
			onTokenUsage: (usage) => {
				// Accumulate tokens for telemetry
				this.accumulatedTokens.inputTokens += usage.inputTokens;
				this.accumulatedTokens.outputTokens += usage.outputTokens;
				this.accumulatedTokens.thinkingTokens += usage.thinkingTokens;
				// Call original callback if provided
				this.originalOnTokenUsage?.(usage);
			},
			callbacks: config.callbacks,
			runMetadata: config.runMetadata,
		});

		// Initialize final response handler
		this.finalResponseHandler = new FinalResponseHandler({
			parseAndValidate: async (code, currentWorkflow) =>
				await this.parseValidateHandler.parseAndValidate(code, currentWorkflow),
		});

		// Create tools
		const searchTool = createCodeBuilderSearchTool(this.nodeTypeParser);
		const getTool = createCodeBuilderGetTool({ nodeDefinitionDirs: config.nodeDefinitionDirs });
		const suggestedNodesTool = createGetSuggestedNodesTool(this.nodeTypeParser);
		this.tools = [searchTool, getTool, suggestedNodesTool];
		this.toolsMap = new Map(this.tools.map((t) => [t.name, t]));

		// Initialize chat setup handler
		this.chatSetupHandler = new ChatSetupHandler({
			llm: config.llm,
			tools: this.tools,
			enableTextEditorConfig: config.enableTextEditor,
			parseAndValidate: async (code, currentWorkflow) =>
				await this.parseValidateHandler.parseAndValidate(code, currentWorkflow),
			getErrorContext: (code, errorMessage) =>
				this.parseValidateHandler.getErrorContext(code, errorMessage),
			nodeTypeParser: this.nodeTypeParser,
			logger: this.logger,
		});

		// Initialize tool dispatch handler
		this.toolDispatchHandler = new ToolDispatchHandler({
			toolsMap: this.toolsMap,
			toolDisplayTitles: new Map([
				[CODE_BUILDER_SEARCH_NODES_TOOL.toolName, CODE_BUILDER_SEARCH_NODES_TOOL.displayTitle],
				[CODE_BUILDER_GET_NODE_TYPES_TOOL.toolName, CODE_BUILDER_GET_NODE_TYPES_TOOL.displayTitle],
				[
					CODE_BUILDER_GET_SUGGESTED_NODES_TOOL.toolName,
					CODE_BUILDER_GET_SUGGESTED_NODES_TOOL.displayTitle,
				],
			]),
			validateToolHandler: this.validateToolHandler,
		});
	}

	/**
	 * Reset accumulated token counters for a new chat session
	 */
	private resetAccumulatedTokens(): void {
		this.accumulatedTokens = { inputTokens: 0, outputTokens: 0, thinkingTokens: 0 };
	}

	/**
	 * Emit "Code builder agent ran" telemetry event
	 */
	private emitTelemetryEvent(params: {
		userId: string;
		workflowId?: string;
		userMessageId: string;
		sessionId?: string;
		status: 'success' | 'error' | 'aborted';
		errorMessage?: string;
		iterationCount: number;
		durationMs: number;
		beforeWorkflow?: WorkflowJSON;
		afterWorkflow?: WorkflowJSON | null;
	}): void {
		if (!this.onTelemetryEvent) {
			return;
		}

		const {
			userId,
			workflowId,
			userMessageId,
			sessionId,
			status,
			errorMessage,
			iterationCount,
			durationMs,
			beforeWorkflow,
			afterWorkflow,
		} = params;

		const nodeChanges = calculateNodeChanges(beforeWorkflow, afterWorkflow);

		const properties: ITelemetryTrackProperties = {
			user_id: userId,
			workflow_id: workflowId,
			user_message_id: userMessageId,
			session_id: sessionId,
			status,
			duration_ms: durationMs,
			iteration_count: iterationCount,
			input_tokens: this.accumulatedTokens.inputTokens,
			output_tokens: this.accumulatedTokens.outputTokens,
			thinking_tokens: this.accumulatedTokens.thinkingTokens,
			nodes_added: nodeChanges.nodes_added,
			nodes_removed: nodeChanges.nodes_removed,
			nodes_modified: nodeChanges.nodes_modified,
		};

		if (errorMessage) {
			properties.error_message = errorMessage;
		}

		this.onTelemetryEvent('Code builder agent ran', properties);
	}

	/**
	 * Main chat method - generates workflow and streams output
	 * Implements an agentic loop that handles tool calls for node discovery
	 *
	 * @param payload - Chat payload with message and workflow context
	 * @param userId - User ID for logging
	 * @param abortSignal - Optional abort signal
	 * @param historyContext - Optional conversation history for multi-turn refinement
	 */
	async *chat(
		payload: ChatPayload,
		userId: string,
		abortSignal?: AbortSignal,
		historyContext?: HistoryContext,
	): AsyncGenerator<StreamOutput, void, unknown> {
		const startTime = Date.now();

		// Reset accumulated tokens for this chat session
		this.resetAccumulatedTokens();

		// Capture before workflow for node diff calculation
		const beforeWorkflow = payload.workflowContext?.currentWorkflow as WorkflowJSON | undefined;

		const workflowId = beforeWorkflow?.id;

		// Track state for telemetry in catch block
		let iteration = 0;

		try {
			this.logger?.debug('Code builder agent starting', {
				userId,
				messageLength: payload.message.length,
			});

			// Setup phase - build prompt, bind tools, format messages, initialize handlers
			const setupResult = await this.chatSetupHandler.execute({
				payload,
				historyContext,
			});

			const {
				llmWithTools,
				messages,
				textEditorEnabled,
				currentWorkflow,
				textEditorHandler,
				textEditorToolHandler,
			} = setupResult;

			// Run agentic loop
			const loopResult = yield* this.runAgenticLoop({
				llmWithTools,
				messages,
				textEditorEnabled,
				currentWorkflow,
				textEditorHandler,
				textEditorToolHandler,
				abortSignal,
				payload,
				previousMessages: historyContext?.conversationEntries.map(entryToString) ?? [],
			});

			const { workflow } = loopResult;
			iteration = loopResult.iteration;

			if (workflow) {
				// Log success
				this.logger?.info('Code builder agent generated workflow', {
					userId,
					nodeCount: workflow.nodes.length,
					iterations: iteration,
				});

				// Stream workflow update
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'workflow-updated',
							codeSnippet: JSON.stringify(workflow, null, 2),
							iterationCount: iteration,
						} as WorkflowUpdateChunk,
					],
				};
			} else {
				this.logger?.info('Code builder agent generated EMPTY workflow', {
					userId,
					nodeCount: 0,
					iterations: iteration,
				});
			}

			// Yield session messages for persistence (includes tool calls and results)
			yield {
				messages: [
					{
						type: 'session-messages',
						messages,
					} as SessionMessagesChunk,
				],
			};

			const totalDuration = Date.now() - startTime;

			// Emit success telemetry
			this.emitTelemetryEvent({
				userId,
				workflowId,
				userMessageId: payload.id,
				status: 'success',
				iterationCount: iteration,
				durationMs: totalDuration,
				beforeWorkflow,
				afterWorkflow: workflow,
			});
		} catch (error) {
			const totalDuration = Date.now() - startTime;
			const rawErrorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			const userFacingMessage = sanitizeLlmErrorMessage(error);

			this.logger?.error('Code builder agent failed', {
				userId,
				error: rawErrorMessage,
				stack: errorStack,
			});

			// Stream sanitized error message to user
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: `I encountered an error while generating the workflow. ${userFacingMessage}`,
					} as AgentMessageChunk,
				],
			};

			// Determine if this was an abort or a regular error
			const isAborted =
				error instanceof Error && (error.name === 'AbortError' || error.message === 'Aborted');
			const status = isAborted ? 'aborted' : 'error';

			// Emit error/abort telemetry
			this.emitTelemetryEvent({
				userId,
				workflowId,
				userMessageId: payload.id,
				status,
				errorMessage: isAborted ? undefined : rawErrorMessage,
				iterationCount: iteration,
				durationMs: totalDuration,
				beforeWorkflow,
				afterWorkflow: null,
			});
		}
	}

	/**
	 * Run the agentic loop that invokes LLM and processes tool calls
	 */
	private async *runAgenticLoop(
		params: AgenticLoopParams,
	): AsyncGenerator<StreamOutput, AgenticLoopResult, unknown> {
		const {
			llmWithTools,
			messages,
			textEditorEnabled,
			currentWorkflow,
			textEditorHandler,
			textEditorToolHandler,
			abortSignal,
			payload,
			previousMessages,
		} = params;

		const state: AgenticLoopState = {
			iteration: 0,
			consecutiveParseErrors: 0,
			workflow: null,
			parseDuration: 0,
			sourceCode: null,
			textEditorValidateAttempts: 0,
			warningTracker: new WarningTracker(),
			outputTrace: [],
			hasUnvalidatedEdits: false,
		};

		// Pre-validate existing workflow to discover pre-existing warnings
		if (currentWorkflow) {
			try {
				const preExisting = this.parseValidateHandler.validateExistingWorkflow(currentWorkflow);
				if (preExisting.length > 0) {
					state.warningTracker.markAsPreExisting(preExisting);
				}
			} catch {
				// Pre-validation failure is non-fatal
			}
		}

		// Create a parent run to group all LLM invocations under a single trace
		const callbackManager = CallbackManager.configure(
			this.iterationHandler.getCallbacks(),
			undefined,
			undefined,
			undefined,
			this.iterationHandler.getRunMetadata(),
		);
		let parentRunManager: CallbackManagerForChainRun | undefined;
		if (callbackManager) {
			const isFirstGeneration = !payload.workflowContext?.currentWorkflow?.nodes?.length;
			const isFirstMessage = previousMessages.length === 0;

			parentRunManager = await callbackManager.handleChainStart(
				{ lc: 1, type: 'not_implemented' as const, id: ['CodeBuilderAgent'] },
				{
					payload,
					previousMessages,
				},
				undefined,
				undefined,
				undefined,
				{
					...this.iterationHandler.getRunMetadata(),
					first_generation: isFirstGeneration,
					first_message: isFirstMessage,
				},
				'CodeBuilderAgentLoop',
			);
		}

		try {
			while (state.iteration < MAX_AGENT_ITERATIONS) {
				this.checkConsecutiveParseErrors(state.consecutiveParseErrors);
				state.iteration++;

				// Derive child callbacks for this iteration so the LLM call is nested under the parent run
				const childCallbacks = parentRunManager?.getChild(`iteration_${state.iteration}`);

				// Invoke LLM and stream response
				const llmResult = yield* this.iterationHandler.invokeLlm({
					llmWithTools,
					messages,
					abortSignal,
					iteration: state.iteration,
					callbacks: childCallbacks,
				});

				// Accumulate output trace entries for the parent LangSmith trace
				if (llmResult.textContent) {
					state.outputTrace.push({ type: 'text', text: llmResult.textContent });
				}
				if (llmResult.hasToolCalls && llmResult.response.tool_calls) {
					for (const toolCall of llmResult.response.tool_calls) {
						state.outputTrace.push({ type: 'tool-call', toolName: toolCall.name });
					}
				}

				const iterationResult = yield* this.processIteration({
					llmResult,
					messages,
					currentWorkflow,
					textEditorEnabled,
					textEditorHandler,
					textEditorToolHandler,
					state,
				});

				if (iterationResult.shouldBreak) {
					break;
				}
			}

			await parentRunManager?.handleChainEnd({
				iterations: state.iteration,
				hasWorkflow: !!state.workflow,
				outputTrace: state.outputTrace,
				output: state.workflow
					? { code: state.sourceCode, workflow: JSON.stringify(state.workflow) }
					: null,
			});
		} catch (error) {
			await parentRunManager?.handleChainError(error);
			throw error;
		}

		return {
			workflow: state.workflow,
			parseDuration: state.parseDuration,
			sourceCode: state.sourceCode,
			iteration: state.iteration,
		};
	}

	/**
	 * Check if we've hit the consecutive parse error limit
	 */
	private checkConsecutiveParseErrors(count: number): void {
		if (count >= 3) {
			throw new Error('Failed to parse workflow code after 3 consecutive attempts.');
		}
	}

	/**
	 * Process a single iteration of the agentic loop
	 */
	private async *processIteration(params: {
		llmResult: { hasToolCalls: boolean; response: AIMessage };
		messages: BaseMessage[];
		currentWorkflow?: WorkflowJSON;
		textEditorEnabled: boolean;
		textEditorHandler?: TextEditorHandler;
		textEditorToolHandler?: TextEditorToolHandler;
		state: AgenticLoopState;
	}): AsyncGenerator<StreamOutput, { shouldBreak: boolean }, unknown> {
		const {
			llmResult,
			messages,
			currentWorkflow,
			textEditorEnabled,
			textEditorHandler,
			textEditorToolHandler,
			state,
		} = params;

		const response = llmResult.response;

		// Branch 1: Process tool calls
		if (llmResult.hasToolCalls && response.tool_calls) {
			return yield* this.handleToolCalls({
				toolCalls: response.tool_calls,
				messages,
				currentWorkflow,
				textEditorEnabled,
				textEditorHandler,
				textEditorToolHandler,
				state,
			});
		}

		// Branch 2: Text editor auto-finalize
		if (textEditorEnabled && textEditorHandler) {
			return yield* this.handleTextEditorAutoFinalize({
				textEditorHandler,
				currentWorkflow,
				messages,
				state,
			});
		}

		// Branch 3: Final response processing
		return await this.handleFinalResponse({
			response: llmResult.response,
			currentWorkflow,
			messages,
			state,
		});
	}

	/**
	 * Handle tool calls from LLM response
	 */
	private async *handleToolCalls(params: {
		toolCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }>;
		messages: BaseMessage[];
		currentWorkflow?: WorkflowJSON;
		textEditorEnabled: boolean;
		textEditorHandler?: TextEditorHandler;
		textEditorToolHandler?: TextEditorToolHandler;
		state: AgenticLoopState;
	}): AsyncGenerator<StreamOutput, { shouldBreak: boolean }, unknown> {
		const {
			toolCalls,
			messages,
			currentWorkflow,
			textEditorEnabled,
			textEditorHandler,
			textEditorToolHandler,
			state,
		} = params;

		state.consecutiveParseErrors = 0;

		const dispatchResult = yield* this.toolDispatchHandler.dispatch({
			toolCalls,
			messages,
			currentWorkflow,
			iteration: state.iteration,
			textEditorHandler,
			textEditorToolHandler,
			warningTracker: state.warningTracker,
		});

		// Update state from dispatch result
		if (dispatchResult.hasUnvalidatedEdits !== undefined) {
			state.hasUnvalidatedEdits = dispatchResult.hasUnvalidatedEdits;
		}
		if (dispatchResult.workflow) {
			state.workflow = dispatchResult.workflow;
		}
		if (dispatchResult.parseDuration !== undefined) {
			state.parseDuration = dispatchResult.parseDuration;
		}
		if (dispatchResult.workflowReady) {
			state.sourceCode = dispatchResult.sourceCode ?? null;
			state.textEditorValidateAttempts = 0;
			return { shouldBreak: true };
		}

		// Increment validate attempts counter when validate_workflow was called but failed
		const hadValidateCall = toolCalls.some((tc) => tc.name === 'validate_workflow');
		if (hadValidateCall && !dispatchResult.workflowReady) {
			state.textEditorValidateAttempts++;
		}

		// Check for too many validate failures
		if (textEditorEnabled && state.textEditorValidateAttempts >= MAX_VALIDATE_ATTEMPTS) {
			throw new Error(
				`Failed to generate valid workflow after ${MAX_VALIDATE_ATTEMPTS} validate attempts.`,
			);
		}

		return { shouldBreak: false };
	}

	/**
	 * Handle text editor auto-finalize when no tool calls
	 */
	private async *handleTextEditorAutoFinalize(params: {
		textEditorHandler: TextEditorHandler;
		currentWorkflow?: WorkflowJSON;
		messages: BaseMessage[];
		state: AgenticLoopState;
	}): AsyncGenerator<StreamOutput, { shouldBreak: boolean }, unknown> {
		const { textEditorHandler, currentWorkflow, messages, state } = params;

		const code = textEditorHandler.getWorkflowCode();

		// No code exists — the LLM stopped calling tools without writing code, exit cleanly
		if (!code) {
			return { shouldBreak: true };
		}

		// Skip validation if code exists but no edits since last validation
		if (!state.hasUnvalidatedEdits && code) {
			if (state.workflow) {
				state.sourceCode = code;
				return { shouldBreak: true };
			}
			state.textEditorValidateAttempts++;
			if (state.textEditorValidateAttempts >= MAX_VALIDATE_ATTEMPTS) {
				throw new Error(
					`Failed to generate valid workflow after ${MAX_VALIDATE_ATTEMPTS} validate attempts.`,
				);
			}
			pushValidationFeedback(messages, 'Please use the text editor to fix the validation errors.');
			return { shouldBreak: false };
		}

		state.textEditorValidateAttempts++;
		state.hasUnvalidatedEdits = false;

		if (state.textEditorValidateAttempts >= MAX_VALIDATE_ATTEMPTS) {
			throw new Error(
				`Failed to generate valid workflow after ${MAX_VALIDATE_ATTEMPTS} validate attempts.`,
			);
		}

		const autoFinalizeResult = yield* this.autoFinalizeHandler.execute({
			code,
			currentWorkflow,
			messages,
			warningTracker: state.warningTracker,
		});

		if (autoFinalizeResult.success && autoFinalizeResult.workflow) {
			state.workflow = autoFinalizeResult.workflow;
			state.parseDuration = autoFinalizeResult.parseDuration ?? 0;
			state.sourceCode = textEditorHandler.getWorkflowCode() ?? null;
			state.textEditorValidateAttempts = 0;
			return { shouldBreak: true };
		}

		if (autoFinalizeResult.parseDuration) {
			state.parseDuration = autoFinalizeResult.parseDuration;
		}

		return { shouldBreak: false };
	}

	/**
	 * Handle final response when no tool calls (non-text-editor mode)
	 */
	private async handleFinalResponse(params: {
		response: AIMessage;
		currentWorkflow?: WorkflowJSON;
		messages: BaseMessage[];
		state: AgenticLoopState;
	}): Promise<{ shouldBreak: boolean }> {
		const { response, currentWorkflow, messages, state } = params;

		const finalResult = await this.finalResponseHandler.process({
			response,
			currentWorkflow,
			messages,
			warningTracker: state.warningTracker,
		});

		if (finalResult.parseDuration !== undefined) {
			state.parseDuration = finalResult.parseDuration;
		}
		if (finalResult.isParseError) {
			state.consecutiveParseErrors++;
		}

		if (finalResult.success && finalResult.workflow) {
			state.workflow = finalResult.workflow;
			if (finalResult.sourceCode) {
				state.sourceCode = finalResult.sourceCode;
			}
			return { shouldBreak: true };
		}

		return { shouldBreak: false };
	}
}

/**
 * Parameters for the agentic loop
 */
interface AgenticLoopParams {
	llmWithTools: LlmWithTools;
	messages: BaseMessage[];
	textEditorEnabled: boolean;
	currentWorkflow?: WorkflowJSON;
	textEditorHandler?: TextEditorHandler;
	textEditorToolHandler?: TextEditorToolHandler;
	abortSignal?: AbortSignal;
	payload: ChatPayload;
	previousMessages: string[];
}

/**
 * Result of the agentic loop
 */
interface AgenticLoopResult {
	workflow: WorkflowJSON | null;
	parseDuration: number;
	sourceCode: string | null;
	iteration: number;
}

/**
 * A single entry in the output trace — either user-facing text or a tool call name.
 * Args/results are available in child runs, so only the name is captured here.
 */
type TraceEntry = { type: 'text'; text: string } | { type: 'tool-call'; toolName: string };

/**
 * Mutable state for the agentic loop
 */
interface AgenticLoopState {
	iteration: number;
	consecutiveParseErrors: number;
	workflow: WorkflowJSON | null;
	parseDuration: number;
	sourceCode: string | null;
	textEditorValidateAttempts: number;
	warningTracker: WarningTracker;
	outputTrace: TraceEntry[];
	/** Whether the agent has made code edits that haven't been followed by validation */
	hasUnvalidatedEdits: boolean;
}
