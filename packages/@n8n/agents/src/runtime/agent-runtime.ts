import { generateText, streamText } from 'ai';
import type { ModelMessage } from 'ai';
import type { z } from 'zod';

import { computeCost, getModelCost, type ModelCost } from '../catalog';
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
	SubAgentUsage,
} from '../types';
import { AgentEventBus } from './event-bus';
import { saveMessagesToThread } from './memory-store';
import { AgentMessageList, type SerializedMessageList } from './message-list';
import { fromAiFinishReason, fromAiMessages } from './messages';
import { createModel } from './model-factory';
import { RunStateManager, generateRunId } from './run-state';
import {
	accumulateUsage,
	applySubAgentUsage,
	extractToolResults,
	findToolName,
	makeErrorStream,
	makeToolResultMessage,
	normalizeInput,
} from './runtime-helpers';
import { convertChunk } from './stream';
import {
	isAgentToolResult,
	isSuspendedToolResult,
	buildToolMap,
	executeTool,
	toAiSdkTools,
	toAiSdkProviderTools,
} from './tool-adapter';
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

/** Pending tool calls from a suspended run, passed into the loop to execute before the first LLM call. */
interface PendingResume {
	pendingToolCalls: Record<string, PendingToolCall>;
	/** The tool call being resumed with new data. */
	resumeToolCallId: string;
	resumeData: unknown;
	/** Message history for resolving tool names via findToolName(). */
	messages: AgentDbMessage[];
}

type ToolCallOutcome =
	| {
			outcome: 'success';
			toolEntry: ToolResultEntry;
			subAgentUsage?: SubAgentUsage[];
			customMessage?: AgentDbMessage;
	  }
	| { outcome: 'suspended'; payload: unknown };

/** Per-iteration result yielded by iteratePendingToolCalls. */
type PendingToolResult =
	| {
			type: 'success';
			toolCallId: string;
			toolName: string;
			input: JSONValue;
			toolEntry: ToolResultEntry;
			subAgentUsage?: SubAgentUsage[];
			customMessage?: AgentDbMessage;
	  }
	| {
			type: 'suspended';
			runId: string;
			toolCallId: string;
			toolName: string;
			input: JSONValue;
			payload: unknown;
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

	private modelCost: ModelCost | undefined;

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
		let list: AgentMessageList;
		try {
			list = await this.initRun(input, options);
		} catch (error) {
			this.updateState({ status: 'failed' });
			this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			return { messages: [], finishReason: 'error', error };
		}

		try {
			const rawResult = await this.runGenerateLoop(list, options);
			return this.finalizeGenerate(rawResult, list);
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
		let list: AgentMessageList;
		try {
			list = await this.initRun(input, options);
		} catch (error) {
			const isAbort = this.eventBus.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			return makeErrorStream(error);
		}

		return this.startStreamLoop(list, options);
	}

	/**
	 * Resume a suspended tool call with arbitrary data.
	 * Restores the suspended run state, passes pending tool calls into the loop
	 * as pending tool calls, and delegates to the same generate/stream loop used for fresh runs.
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

			const list = AgentMessageList.deserialize(state.messageList);
			const resumeOptions: RunOptions = { resourceId: state.resourceId, threadId: state.threadId };
			const pendingResume: PendingResume = {
				pendingToolCalls: state.pendingToolCalls,
				resumeToolCallId: options.toolCallId,
				resumeData: data,
				messages: state.messageList.messages,
			};

			await this.ensureModelCost();

			if (method === 'generate') {
				const rawResult = await this.runGenerateLoop(list, resumeOptions, pendingResume);
				return this.finalizeGenerate(rawResult, list);
			}

			return this.startStreamLoop(list, resumeOptions, pendingResume);
		} catch (error) {
			const isAbort = this.eventBus.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			if (method === 'generate') {
				return { messages: [], finishReason: 'error', error };
			}
			return makeErrorStream(error);
		}
	}

	// --- Private ---

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
	 * Common setup for generate() and stream(): reset abort state, transition to running,
	 * emit AgentStart, fetch model cost, normalize input, and build the message list.
	 * Throws if buildMessageList fails; callers catch and handle the error.
	 */
	private async initRun(
		input: AgentMessage[] | string,
		options?: RunOptions,
	): Promise<AgentMessageList> {
		this.eventBus.resetAbort();
		this.updateState({
			status: 'running',
			resourceId: options?.resourceId ?? '',
			threadId: options?.threadId ?? '',
		});
		this.eventBus.emit({ type: AgentEvent.AgentStart });
		await this.ensureModelCost();
		const normalizedInput = normalizeInput(input);
		return await this.buildMessageList(normalizedInput, options);
	}

	/**
	 * Post-loop finalization for generate: apply cost, set model id, roll up sub-agent usage,
	 * transition to success, and emit AgentEnd. Returns the finalized result.
	 */
	private finalizeGenerate(result: GenerateResult, list: AgentMessageList): GenerateResult {
		result.usage = this.applyCost(result.usage);
		result.model = this.modelIdString;
		const finalized = applySubAgentUsage(result);
		this.updateState({ status: 'success', messageList: list.serialize() });
		this.eventBus.emit({ type: AgentEvent.AgentEnd, messages: finalized.messages });
		return finalized;
	}

	/**
	 * Core generate loop using generateText (non-streaming).
	 *
	 * @param list - Message list for this turn. Grows during the loop via addResponse().
	 * @param options - Run options for memory persistence.
	 * @param pendingResume - When resuming a suspended run, contains the pending tool calls
	 *   to execute before the first LLM call.
	 */
	private async runGenerateLoop(
		list: AgentMessageList,
		options: RunOptions | undefined,
		pendingResume?: PendingResume,
	): Promise<GenerateResult> {
		const { model, toolMap, aiTools, providerOptions, hasTools } = this.buildLoopContext();

		let totalUsage: TokenUsage | undefined;
		let lastFinishReason: FinishReason = 'stop';
		const toolCallSummary: ToolResultEntry[] = [];
		const collectedSubAgentUsage: SubAgentUsage[] = [];

		// Resolve pending tool calls from a resumed run before the first LLM call.
		if (pendingResume) {
			for await (const result of this.iteratePendingToolCalls(
				pendingResume,
				toolMap,
				list,
				options,
				totalUsage,
			)) {
				if (result.type === 'suspended') {
					return {
						messages: list.responseDelta(),
						finishReason: 'tool-calls',
						usage: totalUsage,
						pendingSuspend: {
							runId: result.runId,
							toolCallId: result.toolCallId,
							toolName: result.toolName,
							input: result.input,
							suspendPayload: result.payload,
						},
					};
				}
				toolCallSummary.push(result.toolEntry);
				if (result.subAgentUsage) collectedSubAgentUsage.push(...result.subAgentUsage);
			}
		}

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

			const aiFinishReason = result.finishReason;
			lastFinishReason = fromAiFinishReason(aiFinishReason);

			totalUsage = accumulateUsage(
				totalUsage,
				result.usage as { inputTokens?: number; outputTokens?: number; totalTokens?: number },
			);

			const responseMessages = result.response.messages as ModelMessage[];
			const newMessages = fromAiMessages(responseMessages);
			list.addResponse(newMessages);

			if (aiFinishReason !== 'tool-calls') {
				this.emitTurnEnd(newMessages, extractToolResults(newMessages));
				break;
			}

			for await (const tcResult of this.iterateToolCalls(
				result.toolCalls,
				toolMap,
				list,
				options,
				totalUsage,
			)) {
				if (this.eventBus.isAborted) {
					this.updateState({ status: 'cancelled' });
					throw new Error('Agent run was aborted');
				}
				if (tcResult.type === 'suspended') {
					return {
						messages: list.responseDelta(),
						finishReason: 'tool-calls',
						usage: totalUsage,
						pendingSuspend: {
							runId: tcResult.runId,
							toolCallId: tcResult.toolCallId,
							toolName: tcResult.toolName,
							input: tcResult.input,
							suspendPayload: tcResult.payload,
						},
					};
				}
				toolCallSummary.push(tcResult.toolEntry);
				if (tcResult.subAgentUsage) collectedSubAgentUsage.push(...tcResult.subAgentUsage);
			}

			// Emit TurnEnd after all tool calls in this iteration are processed
			this.emitTurnEnd(newMessages, extractToolResults(list.responseDelta()));
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
			...(collectedSubAgentUsage.length > 0 && { subAgentUsage: collectedSubAgentUsage }),
		};
	}

	/**
	 * Wire up the external StreamResult and start the stream loop asynchronously.
	 * Returns the readable side immediately; the loop runs in the background.
	 *
	 * @param pendingResume - When resuming a suspended run, contains the pending tool calls
	 *   to execute before the first LLM stream starts.
	 */
	private startStreamLoop(
		list: AgentMessageList,
		options: RunOptions | undefined,
		pendingResume?: PendingResume,
	): StreamResult {
		const { readable, writable } = new TransformStream<StreamChunk, StreamChunk>();
		const writer = writable.getWriter();

		this.runStreamLoop(list, options, writer, pendingResume).catch(async (error: unknown) => {
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
	 * @param pendingResume - When resuming a suspended run, contains the pending tool calls
	 *   to execute before the first LLM call.
	 */
	private async runStreamLoop(
		list: AgentMessageList,
		options: RunOptions | undefined,
		writer: WritableStreamDefaultWriter<StreamChunk>,
		pendingResume?: PendingResume,
	): Promise<void> {
		const { model, toolMap, aiTools, providerOptions, hasTools } = this.buildLoopContext();

		let totalUsage: TokenUsage | undefined;
		let lastFinishReason: FinishReason = 'stop';
		const collectedSubAgentUsage: SubAgentUsage[] = [];
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

		// Resolve pending tool calls from a resumed run before the first LLM call.
		if (pendingResume) {
			try {
				for await (const result of this.iteratePendingToolCalls(
					pendingResume,
					toolMap,
					list,
					options,
					totalUsage,
				)) {
					if (result.type === 'suspended') {
						await writer.write({
							type: 'tool-call-suspended',
							runId: result.runId,
							toolCallId: result.toolCallId,
							toolName: result.toolName,
							input: result.input,
							suspendPayload: result.payload,
						});
						await writer.write({ type: 'finish', finishReason: 'tool-calls' });
						await writer.close();
						return;
					}
					if (result.subAgentUsage) collectedSubAgentUsage.push(...result.subAgentUsage);
					await writer.write({
						type: 'message',
						message: {
							role: 'tool',
							content: [
								{
									type: 'tool-result',
									toolCallId: result.toolCallId,
									toolName: result.toolName,
									result: result.toolEntry.output as JSONValue,
									input: result.input,
								},
							],
						},
					});
					if (result.customMessage) {
						await writer.write({ type: 'message', message: result.customMessage });
					}
				}
			} catch (error) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
				await closeStreamWithError(error, 'failed');
				return;
			}
		}

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

			const aiFinishReason = await result.finishReason;
			const usage = await result.usage;
			const response = await result.response;

			lastFinishReason = fromAiFinishReason(aiFinishReason);

			totalUsage = accumulateUsage(
				totalUsage,
				usage as { inputTokens?: number; outputTokens?: number; totalTokens?: number },
			);

			const responseMessages = response.messages;
			const newMessages = fromAiMessages(responseMessages);
			list.addResponse(newMessages);

			if (aiFinishReason !== 'tool-calls') {
				this.emitTurnEnd(newMessages, extractToolResults(newMessages));
				break;
			}

			const toolCalls = await result.toolCalls;

			try {
				for await (const tcResult of this.iterateToolCalls(
					toolCalls,
					toolMap,
					list,
					options,
					totalUsage,
				)) {
					if (await handleAbort()) return;
					if (tcResult.type === 'suspended') {
						await writer.write({
							type: 'tool-call-suspended',
							runId: tcResult.runId,
							toolCallId: tcResult.toolCallId,
							toolName: tcResult.toolName,
							input: tcResult.input,
							suspendPayload: tcResult.payload,
						});
						// Emit finish and close — consumer calls resume() to continue
						await writer.write({ type: 'finish', finishReason: 'tool-calls' });
						await writer.close();
						return;
					}
					if (tcResult.subAgentUsage) collectedSubAgentUsage.push(...tcResult.subAgentUsage);
					await writer.write({
						type: 'message',
						message: {
							role: 'tool',
							content: [
								{
									type: 'tool-result',
									toolCallId: tcResult.toolCallId,
									toolName: tcResult.toolName,
									result: tcResult.toolEntry.output as JSONValue,
									input: tcResult.input,
								},
							],
						},
					});
					if (tcResult.customMessage) {
						await writer.write({ type: 'message', message: tcResult.customMessage });
					}
				}
			} catch (error) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
				await closeStreamWithError(error, 'failed');
				return;
			}

			// Emit TurnEnd after all tool calls in this iteration are processed
			this.emitTurnEnd(newMessages, extractToolResults(list.responseDelta()));
		}

		const costUsage = this.applyCost(totalUsage);
		const parentCost = costUsage?.cost ?? 0;
		const subCost = collectedSubAgentUsage.reduce((sum, s) => sum + (s.usage.cost ?? 0), 0);
		await writer.write({
			type: 'finish',
			finishReason: lastFinishReason,
			...(costUsage && { usage: costUsage }),
			model: this.modelIdString,
			...(collectedSubAgentUsage.length > 0 && {
				subAgentUsage: collectedSubAgentUsage,
				totalCost: parentCost + subCost,
			}),
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

	/**
	/**
	 * Iterate over all pending tool calls from a suspended run, execute each one,
	 * and yield a typed result per call. Callers handle delivery (return values or stream
	 * chunks) while this method owns: findToolName, processToolCall, building the
	 * remaining-pending map, and persistSuspension.
	 *
	 * Errors from processToolCall propagate out of the generator so each caller can handle
	 * them in its own way (re-throw for generate, write error chunks for stream).
	 *
	 * Yields `{ type: 'suspended' }` for the suspended call then stops. Yields
	 * `{ type: 'success' }` for each completed call.
	 */
	private async *iteratePendingToolCalls(
		pendingResume: PendingResume,
		toolMap: Map<string, BuiltTool>,
		list: AgentMessageList,
		options: RunOptions | undefined,
		totalUsage: TokenUsage | undefined,
	): AsyncGenerator<PendingToolResult> {
		const pendingIds = Object.keys(pendingResume.pendingToolCalls);
		for (let i = 0; i < pendingIds.length; i++) {
			const tcId = pendingIds[i];
			const pending = pendingResume.pendingToolCalls[tcId];
			const toolName = findToolName(tcId, pendingResume.messages);
			const resumeData =
				tcId === pendingResume.resumeToolCallId ? pendingResume.resumeData : undefined;

			const processResult = await this.processToolCall(
				pending.toolCallId,
				toolName,
				pending.input,
				toolMap,
				list,
				resumeData,
			);

			if (processResult.outcome === 'suspended') {
				const remainingPending: Record<string, PendingToolCall> = {};
				for (let j = i; j < pendingIds.length; j++) {
					remainingPending[pendingIds[j]] = pendingResume.pendingToolCalls[pendingIds[j]];
				}
				const runId = await this.persistSuspension(remainingPending, options, list, totalUsage);
				yield {
					type: 'suspended',
					runId,
					toolCallId: pending.toolCallId,
					toolName,
					input: pending.input,
					payload: processResult.payload,
				};
				return;
			}

			yield {
				type: 'success',
				toolCallId: pending.toolCallId,
				toolName,
				input: pending.input,
				toolEntry: processResult.toolEntry,
				subAgentUsage: processResult.subAgentUsage,
				customMessage: processResult.customMessage,
			};
		}
	}

	/**
	 * Iterate over tool calls returned by a single LLM turn, execute each one sequentially,
	 * and yield a typed result per call. Provider-executed calls are skipped.
	 * Callers handle delivery (return values or stream chunks) while this method owns:
	 * processToolCall, suspendRunFromToolCalls, and suspension detection.
	 *
	 * Interruptible tools return a branded SuspendedToolResult. When that happens this
	 * generator yields `{ type: 'suspended' }` and stops so the caller can halt the run.
	 *
	 * Errors from processToolCall propagate out of the generator so each caller can handle
	 * them in its own way (re-throw for generate, write error chunks for stream).
	 */
	private async *iterateToolCalls(
		toolCalls: Array<{
			toolCallId: string;
			toolName: string;
			input: unknown;
			providerExecuted?: boolean;
		}>,
		toolMap: Map<string, BuiltTool>,
		list: AgentMessageList,
		options: RunOptions | undefined,
		totalUsage: TokenUsage | undefined,
	): AsyncGenerator<PendingToolResult> {
		for (let tcIdx = 0; tcIdx < toolCalls.length; tcIdx++) {
			const tc = toolCalls[tcIdx];
			if (tc.providerExecuted) continue;

			const toolInput = tc.input as JSONValue;

			const processResult = await this.processToolCall(
				tc.toolCallId,
				tc.toolName,
				toolInput,
				toolMap,
				list,
			);

			if (processResult.outcome === 'suspended') {
				const { runId } = await this.suspendRunFromToolCalls(
					toolCalls,
					tcIdx,
					options,
					list,
					totalUsage,
				);
				yield {
					type: 'suspended',
					runId,
					toolCallId: tc.toolCallId,
					toolName: tc.toolName,
					input: toolInput,
					payload: processResult.payload,
				};
				return;
			}

			yield {
				type: 'success',
				toolCallId: tc.toolCallId,
				toolName: tc.toolName,
				input: toolInput,
				toolEntry: processResult.toolEntry,
				subAgentUsage: processResult.subAgentUsage,
				customMessage: processResult.customMessage,
			};
		}
	}

	/**
	 * Execute a single tool call, emit lifecycle events, record the result in the
	 * message list, and return the outcome. The caller is responsible for writing
	 * any stream chunks and for handling suspension (building pendingToolCalls and
	 * persisting state).
	 *
	 * On tool execution errors, emits ToolExecutionEnd with isError=true and re-throws.
	 */
	private async processToolCall(
		toolCallId: string,
		toolName: string,
		toolInput: JSONValue,
		toolMap: Map<string, BuiltTool>,
		list: AgentMessageList,
		resumeData?: unknown,
	): Promise<ToolCallOutcome> {
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionStart,
			toolCallId,
			toolName,
			args: toolInput,
		});

		let toolResult: unknown;
		try {
			toolResult = await executeTool(toolName, toolInput, toolMap, resumeData);
		} catch (error) {
			this.eventBus.emit({
				type: AgentEvent.ToolExecutionEnd,
				toolCallId,
				toolName,
				result: error,
				isError: true,
			});
			throw error;
		}

		if (isSuspendedToolResult(toolResult)) {
			return { outcome: 'suspended', payload: toolResult.payload };
		}

		let actualResult = toolResult;
		let extractedSubAgentUsage: SubAgentUsage[] | undefined;
		if (isAgentToolResult(toolResult)) {
			actualResult = toolResult.output;
			extractedSubAgentUsage = toolResult.subAgentUsage;
		}

		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId,
			toolName,
			result: actualResult,
			isError: false,
		});

		const toolResultMsg = makeToolResultMessage(toolCallId, toolName, actualResult);
		list.addResponse(fromAiMessages([toolResultMsg]));

		const builtTool = toolMap.get(toolName);
		const customToolMessage = builtTool?.toMessage?.(actualResult);
		let customMessage: AgentDbMessage | undefined;
		if (customToolMessage) {
			customMessage = toDbMessage(customToolMessage);
			list.addResponse([customMessage]);
		}

		return {
			outcome: 'success',
			toolEntry: { tool: toolName, input: toolInput, output: actualResult },
			subAgentUsage: extractedSubAgentUsage,
			customMessage,
		};
	}

	/** Build common LLM call dependencies shared by both the generate and stream loops. */
	private buildLoopContext() {
		const aiTools = toAiSdkTools(this.config.tools);
		const aiProviderTools = toAiSdkProviderTools(this.config.providerTools);
		const allTools = { ...aiTools, ...aiProviderTools };
		return {
			model: createModel(this.config.model),
			toolMap: buildToolMap(this.config.tools),
			aiTools: allTools,
			providerOptions: this.buildProviderOptions(),
			hasTools: Object.keys(allTools).length > 0,
		};
	}

	/**
	 * Persist a suspended run state and update the current state snapshot.
	 * Returns the new runId. Used both when a tool suspends during a fresh run
	 * (via suspendRunFromToolCalls) and when one suspends during pending tool call resolution.
	 */
	private async persistSuspension(
		pendingToolCalls: Record<string, PendingToolCall>,
		options: RunOptions | undefined,
		list: AgentMessageList,
		totalUsage: TokenUsage | undefined,
	): Promise<string> {
		const runId = generateRunId();
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
		return runId;
	}

	/**
	 * Build a pending-tool-calls map from the remaining entries in `toolCalls`
	 * (starting at `fromIndex`), then delegate to persistSuspension().
	 * Provider-executed tool calls are excluded — they run on the provider's
	 * infrastructure and cannot be resumed.
	 * Returns the new runId and pendingToolCalls map.
	 */
	private async suspendRunFromToolCalls(
		toolCalls: Array<{ toolCallId: string; input: unknown; providerExecuted?: boolean }>,
		fromIndex: number,
		options: RunOptions | undefined,
		list: AgentMessageList,
		totalUsage: TokenUsage | undefined,
	): Promise<{ runId: string; pendingToolCalls: Record<string, PendingToolCall> }> {
		const pendingToolCalls: Record<string, PendingToolCall> = {};
		for (let j = fromIndex; j < toolCalls.length; j++) {
			const tc = toolCalls[j];
			if (tc.providerExecuted) continue;
			pendingToolCalls[tc.toolCallId] = {
				toolCallId: tc.toolCallId,
				input: tc.input as JSONValue,
			};
		}
		const runId = await this.persistSuspension(pendingToolCalls, options, list, totalUsage);
		return { runId, pendingToolCalls };
	}

	/** Emit a TurnEnd event when an assistant message is present in `newMessages`. */
	private emitTurnEnd(newMessages: AgentDbMessage[], toolResults: ContentToolResult[]): void {
		const assistantMsg = newMessages.find((m) => 'role' in m && m.role === 'assistant');
		if (assistantMsg) {
			this.eventBus.emit({ type: AgentEvent.TurnEnd, message: assistantMsg, toolResults });
		}
	}

	/** Patch the current state with partial updates. */
	private updateState(patch: Partial<SerializableAgentState>): void {
		this.currentState = { ...this.currentState, ...patch };
	}

	/** Get the model ID string. */
	private get modelIdString(): string {
		return typeof this.config.model === 'string' ? this.config.model : this.config.model.id;
	}

	/** Fetch model cost from catalog. Retries on subsequent calls if the catalog was unavailable. */
	private async ensureModelCost(): Promise<ModelCost | undefined> {
		if (this.modelCost) return this.modelCost;
		try {
			this.modelCost = await getModelCost(this.modelIdString);
		} catch {
			// Catalog unavailable — proceed without cost data, will retry next call
		}
		return this.modelCost;
	}

	/** Apply cost to a TokenUsage object using catalog pricing. */
	private applyCost(usage: TokenUsage | undefined): TokenUsage | undefined {
		if (!usage || !this.modelCost) return usage;
		return { ...usage, cost: computeCost(usage, this.modelCost) };
	}
}
