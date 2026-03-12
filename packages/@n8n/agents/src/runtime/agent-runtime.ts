import { generateText, streamText } from 'ai';
import type { ModelMessage } from 'ai';
import type { z } from 'zod';

import type { JSONObject, JSONValue } from '../json';
import type { AgentDbMessage, AgentMessage, ContentToolResult } from '../message';
import { toDbMessage } from '../message';
import type {
	AgentRunState,
	AnthropicThinkingConfig,
	BuiltMemory,
	BuiltProviderTool,
	BuiltTool,
	CheckpointStore,
	FinishReason,
	GenerateResult,
	GoogleThinkingConfig,
	OpenAIThinkingConfig,
	PendingToolCall,
	RunOptions,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
	ThinkingConfig,
	TokenUsage,
	XaiThinkingConfig,
} from '../types';
import { AgentEventBus } from './event-bus';
import { saveMessagesToThread } from './memory-store';
import { AgentMessageList, type SerializedMessageList } from './message-list';
import { fromAiMessages } from './messages';
import { createModel } from './model-factory';
import { RunStateManager, generateRunId } from './run-state';
import { convertChunk, toTokenUsage } from './stream';
import { isSuspendedToolResult, buildToolMap, executeTool, toAiSdkTools } from './tool-adapter';
import type { ToolResultEntry } from '../types/agent';
import { AgentEvent } from '../types/event';

export interface AgentRuntimeConfig {
	name: string;
	model: string | { id: string; apiKey?: string };
	instructions: string;
	tools?: BuiltTool[];
	providerTools?: BuiltProviderTool[];
	memory?: BuiltMemory;
	lastMessages?: number;
	structuredOutput?: z.ZodType;
	checkpointStorage?: 'memory' | CheckpointStore;
	thinking?: ThinkingConfig;
	eventBus?: AgentEventBus;
}

const MAX_LOOP_ITERATIONS = 20;

const EMPTY_MESSAGE_LIST: SerializedMessageList = {
	messages: [],
	historyIds: [],
	inputIds: [],
	responseIds: [],
};

/**
 * Core agent execution engine using the Vercel AI SDK directly.
 *
 * - `generate()` uses `generateText()` — no streaming internally.
 * - `stream()` uses `streamText()` — yields chunks in real time.
 *
 * Memory strategy:
 * - `filterLlmMessages` strips custom messages before sending to the LLM.
 * - Memory stores ALL AgentMessages (including custom) unchanged.
 * - New messages for each turn are tracked via AgentMessageList.turnDelta(),
 *   which uses Set-based source tracking to identify turn-only messages.
 *   The list serializes with a historyCount so it can survive process restarts.
 */
export class AgentRuntime {
	private config: AgentRuntimeConfig;

	private runState: RunStateManager;

	private eventBus: AgentEventBus;

	private currentState: SerializableAgentState;

	constructor(config: AgentRuntimeConfig) {
		this.config = config;
		this.runState = new RunStateManager(config.checkpointStorage);
		this.eventBus = config.eventBus ?? new AgentEventBus();
		this.currentState = {
			resourceId: '',
			threadId: '',
			status: 'idle',
			messageList: EMPTY_MESSAGE_LIST,
			pendingToolCalls: {},
		};
	}

	/** Return the latest state snapshot. */
	getState(): SerializableAgentState {
		return { ...this.currentState };
	}

	/** Set the abort flag to cancel the currently running agent. */
	abort(): void {
		this.eventBus.abort();
	}

	/** Non-streaming: run the full agent loop using generateText and return the final result. */
	async generate(input: AgentMessage[] | string, options?: RunOptions): Promise<GenerateResult> {
		this.eventBus.resetAbort();
		this.updateState({
			status: 'running',
			resourceId: options?.resourceId ?? '',
			threadId: options?.threadId ?? '',
		});
		this.eventBus.emit({ type: AgentEvent.AgentStart });

		const normalizedInput = this.normalizeInput(input);

		let list: AgentMessageList;
		try {
			list = await this.buildMessageList(normalizedInput, options);
		} catch (error) {
			this.updateState({ status: 'failed' });
			this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			return { messages: [], finishReason: 'error', error };
		}

		try {
			const result = await this.runGenerateLoop(list, options);
			this.updateState({ status: 'success', messageList: list.serialize() });
			this.eventBus.emit({ type: AgentEvent.AgentEnd, messages: result.messages });
			return result;
		} catch (error) {
			const isAbort = this.eventBus.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			return { messages: list.responseDelta(), finishReason: 'error', error };
		}
	}

	/** Streaming: run the agent loop using streamText, yielding chunks in real time. */
	async stream(input: AgentMessage[] | string, options?: RunOptions): Promise<StreamResult> {
		this.eventBus.resetAbort();
		this.updateState({
			status: 'running',
			resourceId: options?.resourceId ?? '',
			threadId: options?.threadId ?? '',
		});
		this.eventBus.emit({ type: AgentEvent.AgentStart });

		const normalizedInput = this.normalizeInput(input);

		let list: AgentMessageList;
		try {
			list = await this.buildMessageList(normalizedInput, options);
		} catch (error) {
			const isAbort = this.eventBus.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			return this.makeErrorStream(error);
		}

		return this.startStreamLoop(list, options);
	}

	/**
	 * Resume a suspended tool call with arbitrary data.
	 * Re-invokes the tool handler with `ctx.resumeData` populated, processes
	 * any remaining pending tool calls, then continues the agent loop once
	 * all tool calls for the turn are resolved.
	 *
	 * - `'generate'` — runs the generate loop after tool execution, returns `GenerateResult`.
	 * - `'stream'` — runs the stream loop after tool execution, returns `StreamResult`.
	 */
	async resume(
		method: 'generate',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<GenerateResult>;
	async resume(
		method: 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<StreamResult>;
	async resume(
		method: 'generate' | 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<GenerateResult | StreamResult> {
		try {
			const state = await this.runState.resume(options.runId);
			if (!state) throw new Error(`No suspended run found for runId: ${options.runId}`);

			const pending = this.resolvePending(state, options.toolCallId);
			const toolMap = buildToolMap(this.config.tools);
			const toolName = this.findToolName(pending.toolCallId, state.messageList.messages);

			const list = AgentMessageList.deserialize(state.messageList);
			const initialChunks: StreamChunk[] = [];
			const resumeToolCallSummary: ToolResultEntry[] = [];

			const result = await this.executeAndRecordToolCall(
				pending,
				toolName,
				toolMap,
				list,
				initialChunks,
				data,
			);

			if (result.suspended) {
				const remainingPending = { ...state.pendingToolCalls };
				return await this.suspendRun(
					method,
					state,
					remainingPending,
					toolName,
					result.suspendPayload,
					list,
				);
			}

			if (result.toolEntry) {
				resumeToolCallSummary.push(result.toolEntry);
			}

			// Remove the resolved tool call and process remaining pending ones
			const remainingPending = { ...state.pendingToolCalls };
			delete remainingPending[pending.toolCallId];

			const remainingResult = await this.processRemainingPendingToolCalls(
				remainingPending,
				toolMap,
				list,
				state,
				initialChunks,
			);

			for (const entry of remainingResult.toolEntries) {
				resumeToolCallSummary.push(entry);
			}

			if (remainingResult.suspended) {
				return await this.suspendRun(
					method,
					state,
					remainingResult.remainingPending ?? {},
					remainingResult.suspendedToolName ?? '',
					remainingResult.suspendPayload,
					list,
				);
			}

			const resumeOptions: RunOptions = { resourceId: state.resourceId, threadId: state.threadId };

			if (method === 'generate') {
				const genResult = await this.runGenerateLoop(list, resumeOptions);
				this.updateState({ status: 'success', messageList: list.serialize() });
				this.eventBus.emit({ type: AgentEvent.AgentEnd, messages: genResult.messages });
				const allToolCalls = [...resumeToolCallSummary, ...(genResult.toolCalls ?? [])];
				return {
					...genResult,
					...(allToolCalls.length > 0 && { toolCalls: allToolCalls }),
				};
			}

			return this.startStreamLoop(list, resumeOptions, initialChunks);
		} catch (error) {
			const isAbort = this.eventBus.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			if (method === 'generate') {
				return { messages: [], finishReason: 'error', error };
			}
			return this.makeErrorStream(error);
		}
	}

	/**
	 * Execute a single tool call, emit events, record the result in the
	 * message list and initialChunks (for streaming). Returns whether the
	 * tool suspended.
	 */
	private async executeAndRecordToolCall(
		pending: PendingToolCall,
		toolName: string,
		toolMap: Map<string, BuiltTool>,
		list: AgentMessageList,
		initialChunks: StreamChunk[],
		resumeData?: unknown,
	): Promise<{
		suspended: boolean;
		suspendPayload?: unknown;
		toolEntry?: ToolResultEntry;
	}> {
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionStart,
			toolCallId: pending.toolCallId,
			toolName,
			args: pending.input,
		});

		let toolResult: unknown;
		try {
			toolResult = await executeTool(toolName, pending.input, toolMap, resumeData);
		} catch (error) {
			this.eventBus.emit({
				type: AgentEvent.ToolExecutionEnd,
				toolCallId: pending.toolCallId,
				toolName,
				result: error,
				isError: true,
			});
			throw error;
		}

		if (isSuspendedToolResult(toolResult)) {
			return { suspended: true, suspendPayload: toolResult.payload };
		}

		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId: pending.toolCallId,
			toolName,
			result: toolResult,
			isError: false,
		});

		const toolResultMsg = this.makeToolResultMessage(pending.toolCallId, toolName, toolResult);
		list.addResponse(fromAiMessages([toolResultMsg]));

		initialChunks.push({
			type: 'message',
			message: {
				role: 'tool',
				content: [
					{
						type: 'tool-result',
						toolCallId: pending.toolCallId,
						toolName,
						result: toolResult as JSONValue,
						input: pending.input,
					},
				],
			},
		});

		const builtTool = toolMap.get(toolName);
		const customToolMessage = builtTool?.toMessage?.(toolResult);
		if (customToolMessage) {
			const dbCustomToolMessage = toDbMessage(customToolMessage);
			list.addResponse([dbCustomToolMessage]);
			initialChunks.push({ type: 'message', message: dbCustomToolMessage });
		}

		return {
			suspended: false,
			toolEntry: { tool: toolName, input: pending.input, output: toolResult },
		};
	}

	/**
	 * Process remaining pending tool calls (first invocations, no resume data).
	 * Executes them one by one; stops and returns early if any tool suspends.
	 */
	private async processRemainingPendingToolCalls(
		pendingToolCalls: Record<string, PendingToolCall>,
		toolMap: Map<string, BuiltTool>,
		list: AgentMessageList,
		state: SerializableAgentState,
		initialChunks: StreamChunk[],
	): Promise<{
		suspended: boolean;
		suspendedToolName?: string;
		suspendPayload?: unknown;
		remainingPending?: Record<string, PendingToolCall>;
		toolEntries: ToolResultEntry[];
	}> {
		const toolCallIds = Object.keys(pendingToolCalls);
		const toolEntries: ToolResultEntry[] = [];

		for (let i = 0; i < toolCallIds.length; i++) {
			const tcId = toolCallIds[i];
			const pending = pendingToolCalls[tcId];
			const toolName = this.findToolName(tcId, state.messageList.messages);

			const result = await this.executeAndRecordToolCall(
				pending,
				toolName,
				toolMap,
				list,
				initialChunks,
			);

			if (result.suspended) {
				const remaining: Record<string, PendingToolCall> = {};
				for (let j = i; j < toolCallIds.length; j++) {
					remaining[toolCallIds[j]] = pendingToolCalls[toolCallIds[j]];
				}
				return {
					suspended: true,
					suspendedToolName: toolName,
					suspendPayload: result.suspendPayload,
					remainingPending: remaining,
					toolEntries,
				};
			}

			if (result.toolEntry) {
				toolEntries.push(result.toolEntry);
			}
		}

		return { suspended: false, toolEntries };
	}

	/**
	 * Save the run as suspended and return the appropriate result type.
	 * Used both when a tool re-suspends during resume and when a remaining
	 * pending tool call suspends for the first time.
	 */
	private async suspendRun(
		method: 'generate' | 'stream',
		state: SerializableAgentState,
		pendingToolCalls: Record<string, PendingToolCall>,
		toolName: string,
		suspendPayload: unknown,
		list: AgentMessageList,
	): Promise<GenerateResult | StreamResult> {
		const runId = generateRunId();
		const toolCallId = Object.keys(pendingToolCalls)[0];
		const pending = pendingToolCalls[toolCallId];
		const suspendState: SerializableAgentState = {
			resourceId: state.resourceId,
			threadId: state.threadId,
			status: 'suspended',
			messageList: list.serialize(),
			pendingToolCalls,
			usage: state.usage,
		};
		await this.runState.suspend(runId, suspendState);
		this.updateState({ status: 'suspended', pendingToolCalls, messageList: list.serialize() });

		if (method === 'generate') {
			return {
				messages: list.responseDelta(),
				finishReason: 'tool-calls',
				usage: state.usage,
				pendingSuspend: {
					runId,
					toolCallId: pending.toolCallId,
					toolName,
					input: pending.input,
					suspendPayload,
				},
			};
		}

		return new ReadableStream<StreamChunk>({
			start(controller) {
				controller.enqueue({
					type: 'tool-call-suspended',
					runId,
					toolCallId: pending.toolCallId,
					toolName,
					input: pending.input,
					suspendPayload,
				});
				controller.enqueue({ type: 'finish', finishReason: 'tool-calls' });
				controller.close();
			},
		});
	}

	// --- Private ---

	/** Normalize a string input to an AgentDbMessage array, assigning ids where missing. */
	private normalizeInput(input: AgentMessage[] | string): AgentDbMessage[] {
		if (typeof input === 'string') {
			return [toDbMessage({ role: 'user', content: [{ type: 'text', text: input }] })];
		}
		return input.map(toDbMessage);
	}

	/**
	 * Build an AgentMessageList for the current turn:
	 * - Loads memory history (if configured) and adds as historySet
	 * - Adds raw input (custom messages preserved) as inputSet
	 *
	 * The system prompt is NOT stored in the list; list.forLlm(instructions)
	 * prepends it at every LLM call site.
	 */
	private async buildMessageList(
		input: AgentDbMessage[],
		options?: RunOptions,
	): Promise<AgentMessageList> {
		const list = new AgentMessageList();

		if (this.config.memory && options?.threadId) {
			const memMessages = await this.config.memory.getMessages(options.threadId, {
				limit: this.config.lastMessages ?? 10,
			});
			if (memMessages.length > 0) list.addHistory(memMessages.map(toDbMessage));
		}

		list.addInput(input);
		return list;
	}

	/**
	 * Core generate loop using generateText (non-streaming).
	 *
	 * @param list - Message list for this turn. Grows during the loop via addResponse().
	 * @param options - Run options for memory persistence.
	 */
	private async runGenerateLoop(
		list: AgentMessageList,
		options: RunOptions | undefined,
	): Promise<GenerateResult> {
		const { model, toolMap, aiTools, providerOptions, hasTools } = this.buildLoopContext();

		let totalUsage: TokenUsage | undefined;
		let lastFinishReason: FinishReason = 'stop';
		const toolCallSummary: ToolResultEntry[] = [];

		const maxIterations = options?.maxIterations ?? MAX_LOOP_ITERATIONS;
		for (let i = 0; i < maxIterations; i++) {
			if (this.eventBus.isAborted) {
				this.updateState({ status: 'cancelled' });
				throw new Error('Agent run was aborted');
			}

			this.eventBus.emit({ type: AgentEvent.TurnStart });

			const result = await generateText({
				model,
				messages: list.forLlm(this.config.instructions),
				abortSignal: this.eventBus.signal,
				...(hasTools ? { tools: aiTools } : {}),
				...(providerOptions
					? { providerOptions: providerOptions as Record<string, JSONObject> }
					: {}),
			});

			const finishReason = result.finishReason as FinishReason;
			lastFinishReason = finishReason;

			totalUsage = this.accumulateUsage(
				totalUsage,
				result.usage as { inputTokens?: number; outputTokens?: number; totalTokens?: number },
			);

			const responseMessages = result.response.messages as ModelMessage[];
			const newMessages = fromAiMessages(responseMessages);
			list.addResponse(newMessages);

			if (finishReason !== 'tool-calls') {
				this.emitTurnEnd(newMessages, this.extractToolResults(newMessages));
				break;
			}

			// Process tool calls sequentially. Interruptible tools (with suspend/resume)
			// return a branded SuspendedToolResult from their handler.
			// When that happens, execution halts and the run is suspended.
			for (let tcIdx = 0; tcIdx < result.toolCalls.length; tcIdx++) {
				const tc = result.toolCalls[tcIdx];
				const toolInput = tc.input as JSONValue;

				if (this.eventBus.isAborted) {
					this.updateState({ status: 'cancelled' });
					throw new Error('Agent run was aborted');
				}

				this.eventBus.emit({
					type: AgentEvent.ToolExecutionStart,
					toolCallId: tc.toolCallId,
					toolName: tc.toolName,
					args: toolInput,
				});

				let toolResult: unknown;
				try {
					toolResult = await executeTool(tc.toolName, toolInput, toolMap);
				} catch (error) {
					this.eventBus.emit({
						type: AgentEvent.ToolExecutionEnd,
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						result: error,
						isError: true,
					});
					throw error;
				}

				if (isSuspendedToolResult(toolResult)) {
					// Capture this + ALL remaining tool calls so none are lost
					const { runId } = await this.suspendRunFromToolCalls(
						result.toolCalls,
						tcIdx,
						options,
						list,
						totalUsage,
					);
					return {
						messages: list.responseDelta(),
						finishReason: 'tool-calls',
						usage: totalUsage,
						pendingSuspend: {
							runId,
							toolCallId: tc.toolCallId,
							toolName: tc.toolName,
							input: toolInput,
							suspendPayload: toolResult.payload,
						},
					};
				}

				this.eventBus.emit({
					type: AgentEvent.ToolExecutionEnd,
					toolCallId: tc.toolCallId,
					toolName: tc.toolName,
					result: toolResult,
					isError: false,
				});

				toolCallSummary.push({ tool: tc.toolName, input: toolInput, output: toolResult });

				const toolResultMsg = this.makeToolResultMessage(tc.toolCallId, tc.toolName, toolResult);
				list.addResponse(fromAiMessages([toolResultMsg]));

				const builtTool = toolMap.get(tc.toolName);
				const customToolMessage = builtTool?.toMessage?.(toolResult);
				if (customToolMessage) {
					list.addResponse([toDbMessage(customToolMessage)]);
				}
			}

			// Emit TurnEnd after all tool calls in this iteration are processed
			this.emitTurnEnd(newMessages, this.extractToolResults(list.responseDelta()));
		}

		if (lastFinishReason === 'tool-calls') {
			throw new Error(
				`Agent loop exceeded ${maxIterations} iterations without reaching a stop condition`,
			);
		}

		await this.saveToMemory(list, options);

		return {
			messages: list.responseDelta(),
			finishReason: lastFinishReason,
			usage: totalUsage,
			...(toolCallSummary.length > 0 && { toolCalls: toolCallSummary }),
		};
	}

	/**
	 * Wire up the external StreamResult and start the stream loop asynchronously.
	 * Returns the readable side immediately; the loop runs in the background.
	 *
	 * @param initialChunks - Optional chunks to emit before the LLM stream starts.
	 *   Used when resuming after tool approval to emit the tool-result chunk first.
	 */
	private startStreamLoop(
		list: AgentMessageList,
		options: RunOptions | undefined,
		initialChunks?: StreamChunk[],
	): StreamResult {
		const { readable, writable } = new TransformStream<StreamChunk, StreamChunk>();
		const writer = writable.getWriter();

		const run = async () => {
			if (initialChunks) {
				for (const chunk of initialChunks) {
					await writer.write(chunk);
				}
			}
			await this.runStreamLoop(list, options, writer);
		};

		run().catch(async (error: unknown) => {
			// Unexpected error that escaped runStreamLoop — write error chunks and close cleanly
			// so consumers always receive a well-formed stream rather than a thrown error.
			try {
				await writer.write({ type: 'error', error });
				await writer.write({ type: 'finish', finishReason: 'error' });
				await writer.close();
			} catch {
				writer.abort(error).catch(() => {
					// abort() rejection means the stream is already closed — nothing to do
				});
			}
		});

		return readable;
	}

	/**
	 * Core stream loop using streamText.
	 *
	 * @param list - Message list for this turn. Grows during the loop via addResponse().
	 * @param options - Run options for memory persistence.
	 * @param writer - Stream writer to emit StreamChunks to the consumer.
	 */
	private async runStreamLoop(
		list: AgentMessageList,
		options: RunOptions | undefined,
		writer: WritableStreamDefaultWriter<StreamChunk>,
	): Promise<void> {
		const { model, toolMap, aiTools, providerOptions, hasTools } = this.buildLoopContext();

		let totalUsage: TokenUsage | undefined;
		let lastFinishReason: FinishReason = 'stop';
		const maxIterations = options?.maxIterations ?? MAX_LOOP_ITERATIONS;

		const closeStreamWithError = async (error: unknown, status: AgentRunState): Promise<void> => {
			this.updateState({ status });
			await writer.write({ type: 'error', error });
			await writer.write({ type: 'finish', finishReason: 'error' });
			await writer.close();
		};

		const handleAbort = async (): Promise<boolean> => {
			if (!this.eventBus.isAborted) return false;
			await closeStreamWithError(new Error('Agent run was aborted'), 'cancelled');
			return true;
		};

		for (let i = 0; i < maxIterations; i++) {
			if (await handleAbort()) return;

			this.eventBus.emit({ type: AgentEvent.TurnStart });

			const result = streamText({
				model,
				messages: list.forLlm(this.config.instructions),
				abortSignal: this.eventBus.signal,
				...(hasTools ? { tools: aiTools } : {}),
				...(providerOptions
					? { providerOptions: providerOptions as Record<string, JSONObject> }
					: {}),
			});

			// Consume the stream. When the AbortSignal fires mid-stream the
			// AI SDK cancels the underlying fetch and the async iterator throws.
			// We catch that here and close the consumer stream with an error chunk.
			try {
				for await (const chunk of result.fullStream) {
					const c = chunk as { type: string };
					if (c.type === 'finish' || c.type === 'finish-step') continue;
					const converted = convertChunk(chunk);
					if (converted) await writer.write(converted);
				}
			} catch (streamError) {
				if (await handleAbort()) return;
				this.eventBus.emit({
					type: AgentEvent.Error,
					message: String(streamError),
					error: streamError,
				});
				await closeStreamWithError(streamError, 'failed');
				return;
			}

			if (await handleAbort()) return;

			const finishReason = await result.finishReason;
			const usage = await result.usage;
			const response = await result.response;

			lastFinishReason = finishReason;

			totalUsage = this.accumulateUsage(
				totalUsage,
				usage as { inputTokens?: number; outputTokens?: number; totalTokens?: number },
			);

			const responseMessages = response.messages;
			const newMessages = fromAiMessages(responseMessages);
			list.addResponse(newMessages);

			if (finishReason !== 'tool-calls') {
				this.emitTurnEnd(newMessages, this.extractToolResults(newMessages));
				break;
			}

			const toolCalls = await result.toolCalls;

			for (let tcIdx = 0; tcIdx < toolCalls.length; tcIdx++) {
				const tc = toolCalls[tcIdx];
				const toolInput = tc.input as JSONValue;

				if (await handleAbort()) return;

				this.eventBus.emit({
					type: AgentEvent.ToolExecutionStart,
					toolCallId: tc.toolCallId,
					toolName: tc.toolName,
					args: toolInput,
				});

				let toolResult: unknown;
				try {
					toolResult = await executeTool(tc.toolName, toolInput, toolMap);
				} catch (error) {
					this.eventBus.emit({
						type: AgentEvent.ToolExecutionEnd,
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						result: error,
						isError: true,
					});
					this.eventBus.emit({
						type: AgentEvent.Error,
						message: String(error),
						error,
					});
					await closeStreamWithError(error, 'failed');
					return;
				}

				if (isSuspendedToolResult(toolResult)) {
					// Capture this + ALL remaining tool calls so none are lost
					const { runId } = await this.suspendRunFromToolCalls(
						toolCalls,
						tcIdx,
						options,
						list,
						totalUsage,
					);

					await writer.write({
						type: 'tool-call-suspended',
						runId,
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: toolInput,
						suspendPayload: toolResult.payload,
					});

					// Emit finish and close — consumer calls resume() to continue
					await writer.write({ type: 'finish', finishReason: 'tool-calls' });
					await writer.close();
					return;
				}

				this.eventBus.emit({
					type: AgentEvent.ToolExecutionEnd,
					toolCallId: tc.toolCallId,
					toolName: tc.toolName,
					result: toolResult,
					isError: false,
				});

				const toolResultMsg = this.makeToolResultMessage(tc.toolCallId, tc.toolName, toolResult);
				list.addResponse(fromAiMessages([toolResultMsg]));

				await writer.write({
					type: 'message',
					message: {
						role: 'tool',
						content: [
							{
								type: 'tool-result',
								toolCallId: tc.toolCallId,
								toolName: tc.toolName,
								result: toolResult as JSONValue,
								input: toolInput,
							},
						],
					},
				});

				const builtTool = toolMap.get(tc.toolName);
				const customToolMessage = builtTool?.toMessage?.(toolResult);
				if (customToolMessage) {
					const dbCustomToolMessage = toDbMessage(customToolMessage);
					list.addResponse([dbCustomToolMessage]);
					await writer.write({ type: 'message', message: dbCustomToolMessage });
				}
			}

			// Emit TurnEnd after all tool calls in this iteration are processed
			this.emitTurnEnd(newMessages, this.extractToolResults(list.responseDelta()));
		}

		await writer.write({
			type: 'finish',
			finishReason: lastFinishReason,
			...(totalUsage && { usage: totalUsage }),
		});

		try {
			await this.saveToMemory(list, options);
			this.updateState({ status: 'success', messageList: list.serialize() });
			this.eventBus.emit({ type: AgentEvent.AgentEnd, messages: list.responseDelta() });
		} finally {
			await writer.close();
		}
	}

	/** Persist the current-turn delta to memory. */
	private async saveToMemory(
		list: AgentMessageList,
		options: RunOptions | undefined,
	): Promise<void> {
		if (!this.config.memory || !options?.threadId) return;
		const delta = list.turnDelta();
		if (delta.length === 0) return;
		await saveMessagesToThread(this.config.memory, options.threadId, options.resourceId, delta);
	}

	/** Build the providerOptions object for thinking/reasoning config. */
	private buildProviderOptions(): Record<string, Record<string, unknown>> | undefined {
		if (!this.config.thinking) return undefined;

		const modelId =
			typeof this.config.model === 'string' ? this.config.model : this.config.model.id;
		const provider = modelId.split('/')[0];
		const thinking = this.config.thinking;

		switch (provider) {
			case 'anthropic': {
				const cfg = thinking as AnthropicThinkingConfig;
				return {
					anthropic: {
						thinking: {
							type: 'enabled',
							budgetTokens: cfg.budgetTokens ?? 10000,
						},
					},
				};
			}
			case 'openai': {
				const cfg = thinking as OpenAIThinkingConfig;
				return { openai: { reasoningEffort: cfg.reasoningEffort ?? 'medium' } };
			}
			case 'google': {
				const cfg = thinking as GoogleThinkingConfig;
				return {
					google: {
						thinkingConfig: {
							...(cfg.thinkingBudget !== undefined && { thinkingBudget: cfg.thinkingBudget }),
							...(cfg.thinkingLevel !== undefined && { thinkingLevel: cfg.thinkingLevel }),
						},
					},
				};
			}
			case 'xai': {
				const cfg = thinking as XaiThinkingConfig;
				return { xai: { reasoningEffort: cfg.reasoningEffort ?? 'high' } };
			}
			default:
				return undefined;
		}
	}

	/** Accumulate token usage across loop iterations. */
	private mergeUsage(
		current: TokenUsage | undefined,
		next: TokenUsage | undefined,
	): TokenUsage | undefined {
		if (!next) return current;
		if (!current) return next;
		return {
			promptTokens: current.promptTokens + next.promptTokens,
			completionTokens: current.completionTokens + next.completionTokens,
			totalTokens: current.totalTokens + next.totalTokens,
		};
	}

	/** Build an AI SDK tool ModelMessage for a tool execution result. */
	private makeToolResultMessage(
		toolCallId: string,
		toolName: string,
		result: unknown,
	): ModelMessage {
		return {
			role: 'tool',
			content: [
				{
					type: 'tool-result',
					toolCallId,
					toolName,
					output: { type: 'json', value: result as JSONValue },
				},
			],
		};
	}

	/**
	 * Find the tool name for a given toolCallId by scanning the message history.
	 * Skips custom messages.
	 */
	private findToolName(toolCallId: string, messages: AgentDbMessage[]): string {
		for (let i = messages.length - 1; i >= 0; i--) {
			const msg = messages[i];
			if (msg.type === 'custom') continue;
			if (msg.role === 'assistant') {
				for (const part of msg.content) {
					if (part.type === 'tool-call' && part.toolCallId === toolCallId) {
						return part.toolName;
					}
				}
			}
		}
		throw new Error(`Could not find tool name for toolCallId: ${toolCallId}`);
	}

	/** Resolve the pending tool call from state, using the given toolCallId or defaulting to the first. */
	private resolvePending(state: SerializableAgentState, toolCallId?: string): PendingToolCall {
		const pending = toolCallId
			? state.pendingToolCalls[toolCallId]
			: Object.values(state.pendingToolCalls)[0];
		if (!pending) throw new Error('No pending tool call found in suspended state');
		return pending;
	}

	/**
	 * Return a ReadableStream that immediately yields an error chunk followed by
	 * a finish chunk. Used when setup errors prevent the normal stream loop from
	 * starting, so callers always receive a well-formed stream.
	 */
	private makeErrorStream(error: unknown): StreamResult {
		const { readable, writable } = new TransformStream<StreamChunk, StreamChunk>();
		const writer = writable.getWriter();
		writer.write({ type: 'error', error }).catch(() => {});
		writer.write({ type: 'finish', finishReason: 'error' }).catch(() => {});
		writer.close().catch(() => {});
		return readable;
	}

	/** Build common LLM call dependencies shared by both the generate and stream loops. */
	private buildLoopContext() {
		const aiTools = toAiSdkTools(this.config.tools);
		return {
			model: createModel(this.config.model),
			toolMap: buildToolMap(this.config.tools),
			aiTools,
			providerOptions: this.buildProviderOptions(),
			hasTools: Object.keys(aiTools).length > 0,
		};
	}

	/**
	 * Build a pending-tool-calls map from the remaining entries in `toolCalls`
	 * (starting at `fromIndex`), persist the suspended run, and update the
	 * current state snapshot. Returns the new runId and pendingToolCalls map.
	 */
	private async suspendRunFromToolCalls(
		toolCalls: Array<{ toolCallId: string; input: unknown }>,
		fromIndex: number,
		options: RunOptions | undefined,
		list: AgentMessageList,
		totalUsage: TokenUsage | undefined,
	): Promise<{ runId: string; pendingToolCalls: Record<string, PendingToolCall> }> {
		const runId = generateRunId();
		const pendingToolCalls: Record<string, PendingToolCall> = {};
		for (let j = fromIndex; j < toolCalls.length; j++) {
			const tc = toolCalls[j];
			pendingToolCalls[tc.toolCallId] = {
				toolCallId: tc.toolCallId,
				input: tc.input as JSONValue,
			};
		}
		const state: SerializableAgentState = {
			resourceId: options?.resourceId ?? '',
			threadId: options?.threadId ?? '',
			status: 'suspended',
			messageList: list.serialize(),
			pendingToolCalls,
			usage: totalUsage,
		};
		await this.runState.suspend(runId, state);
		this.updateState({ status: 'suspended', pendingToolCalls, messageList: list.serialize() });
		return { runId, pendingToolCalls };
	}

	/** Extract all tool-result content parts from a flat list of agent messages. */
	private extractToolResults(messages: AgentDbMessage[]): ContentToolResult[] {
		return messages
			.flatMap((m) => ('content' in m ? m.content : []))
			.filter((c): c is ContentToolResult => c.type === 'tool-result');
	}

	/** Emit a TurnEnd event when an assistant message is present in `newMessages`. */
	private emitTurnEnd(newMessages: AgentDbMessage[], toolResults: ContentToolResult[]): void {
		const assistantMsg = newMessages.find((m) => 'role' in m && m.role === 'assistant');
		if (assistantMsg) {
			this.eventBus.emit({ type: AgentEvent.TurnEnd, message: assistantMsg, toolResults });
		}
	}

	/**
	 * Accumulate token usage across loop iterations.
	 * Wraps `mergeUsage` + `toTokenUsage` to keep call sites concise.
	 */
	private accumulateUsage(
		current: TokenUsage | undefined,
		raw: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
	): TokenUsage | undefined {
		if (!raw) return current;
		return this.mergeUsage(current, toTokenUsage(raw));
	}

	/** Patch the current state with partial updates. */
	private updateState(patch: Partial<SerializableAgentState>): void {
		this.currentState = { ...this.currentState, ...patch };
	}
}
