import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { TelemetrySettings, ToolCallRepairFunction, ToolSet } from 'ai';
import type { JSONSchema7 } from 'json-schema';
import type { z } from 'zod';

import { incrementMessageCount, incrementTokenCountFromUsage } from './execution-counter';
import { GenerateSink } from './generate-sink';
import type { RunOutputSink, RunServices } from './run-output-sink';
import { RuntimeContextBuilder, getModelIdString } from './runtime-context';
import {
	accumulateUsage,
	extractSettledToolCalls,
	makeErrorStream,
	normalizeInput,
} from './runtime-helpers';
import { StreamSink } from './stream-sink';
import { isCancellation } from '../../sdk/cancellation';
import { computeCost, getModelCost, type ModelCost } from '../../sdk/catalog';
import type {
	BuiltMemory,
	BuiltProviderTool,
	BuiltTelemetry,
	BuiltTool,
	CheckpointStore,
	EpisodicMemoryConfig,
	FinishReason,
	GenerateResult,
	ObservationalMemoryConfig,
	ObservationLogMemoryConfig,
	PendingToolCall,
	RunOptions,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
	ThinkingConfig,
	TitleGenerationConfig,
	TokenUsage,
} from '../../types';
import { AgentEvent } from '../../types/runtime/event';
import type {
	ExecutionOptions,
	ModelConfig,
	PersistedExecutionOptions,
} from '../../types/sdk/agent';
import type { AgentMessage, ContentToolCall } from '../../types/sdk/message';
import type { JSONValue } from '../../types/utils/json';
import { parseWithSchema } from '../../utils/parse';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import type { ScopedMemoryTaskEvent } from '../memory/scoped-memory-task-runner';
import { generateThreadTitle } from '../memory/title-generation';
import { AgentMessageList, type SerializedMessageList } from '../model/message-list';
import type { FetchFn } from '../model/model-factory';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus, type AgentAbortScope } from '../state/event-bus';
import { generateRunId, RunStateManager } from '../state/run-state';
import { startStreamSession } from '../streaming/stream-session';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';
import { DeferredToolManager } from '../tools/deferred-tool-manager';
import { fixToolCall } from '../tools/fix-tool-call';
import {
	ToolCallExecutor,
	type PendingResume,
	type ToolBatchContext,
} from '../tools/tool-call-executor';

export interface AgentRuntimeConfig {
	name: string;
	model: ModelConfig;
	/**
	 * Proxy-aware `fetch` used for all model calls in this runtime (main model and
	 * title generation). When unset, model construction falls back to the ambient
	 * HTTP_PROXY resolver.
	 */
	modelFetch?: FetchFn;
	instructions: string;
	instructionProviderOptions?: ProviderOptions;
	tools?: BuiltTool[];
	deferredTools?: BuiltTool[];
	toolSearch?: {
		topK?: number;
	};
	providerTools?: BuiltProviderTool[];
	memory?: BuiltMemory;
	observationLog?: ObservationLogMemoryConfig;
	observationalMemory?: ObservationalMemoryConfig;
	episodicMemory?: EpisodicMemoryConfig;
	structuredOutput?: z.ZodType | JSONSchema7;
	checkpointStorage?: 'memory' | CheckpointStore;
	thinking?: ThinkingConfig;
	eventBus?: AgentEventBus;
	/** Number of tool calls to execute concurrently. Default `1` (sequential). */
	toolCallConcurrency?: number;
	titleGeneration?: TitleGenerationConfig;
	telemetry?: BuiltTelemetry;
	/** Existing run id to continue, used when resuming a suspended run. */
	runId?: string;
	/**
	 * Pre-fetched model cost from the catalog. When provided, skips the per-run
	 * catalog fetch. Set once during Agent.build() and shared across per-run runtimes.
	 */
	modelCost?: ModelCost;
	/**
	 * Shared RunStateManager for suspend/resume. When provided, per-run runtimes
	 * use the same store so resume() can find state from a prior run.
	 */
	runState?: RunStateManager;
	/** Host callback for observational-memory background task lifecycle events. */
	onMemoryTaskEvent?: (event: ScopedMemoryTaskEvent) => void;
}

const MAX_LOOP_ITERATIONS = 30;

const EMPTY_MESSAGE_LIST: SerializedMessageList = {
	messages: [],
	historyIds: [],
	inputIds: [],
	responseIds: [],
};

type RuntimeExecutionOptions = RunOptions & ExecutionOptions & { iterationCount?: number };

/** Shared input for the private generate/stream loops. */
interface LoopContext {
	list: AgentMessageList;
	options?: RuntimeExecutionOptions;
	abortScope: AgentAbortScope;
	pendingResume?: PendingResume;
}

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
 *   The list serializes with id-based sets so it can survive process restarts.
 */
export class AgentRuntime {
	private config: AgentRuntimeConfig;

	private runState: RunStateManager;

	private eventBus: AgentEventBus;

	private currentState: SerializableAgentState;

	private modelCost: ModelCost | undefined;

	private backgroundTasks = new BackgroundTaskTracker();

	private deferredToolManager: DeferredToolManager | undefined;

	private runId: string;

	private telemetry: RuntimeTelemetry;

	private memory: MemoryOrchestrator;

	private context: RuntimeContextBuilder;

	private toolExecutor: ToolCallExecutor;

	constructor(config: AgentRuntimeConfig) {
		this.config = config;
		this.telemetry = new RuntimeTelemetry(config);
		this.runId = config.runId ?? generateRunId();
		if (config.deferredTools && config.deferredTools.length > 0) {
			this.deferredToolManager = new DeferredToolManager(config.deferredTools, config.toolSearch);
		}
		this.context = new RuntimeContextBuilder(config, this.deferredToolManager);
		this.runState = config.runState ?? new RunStateManager(config.checkpointStorage);
		this.eventBus = config.eventBus ?? new AgentEventBus();
		this.memory = new MemoryOrchestrator(config, this.backgroundTasks, this.eventBus);
		this.toolExecutor = new ToolCallExecutor({
			telemetry: this.telemetry,
			eventBus: this.eventBus,
			concurrency: config.toolCallConcurrency ?? 1,
			onCancelled: () => this.updateState({ status: 'cancelled' }),
		});
		this.modelCost = config.modelCost;
		this.currentState = {
			persistence: undefined,
			status: 'idle',
			messageList: EMPTY_MESSAGE_LIST,
			pendingToolCalls: {},
		};
	}

	setTelemetry(telemetry: BuiltTelemetry | undefined): void {
		this.config.telemetry = telemetry;
	}

	/**
	 * Wait for in-flight background tasks (title generation, future
	 * observer cycles) to settle. Safe to call multiple times.
	 */
	async dispose(): Promise<void> {
		this.eventBus.dispose();
		await this.backgroundTasks.flush();
	}

	/** Return the latest state snapshot. */
	getState(): SerializableAgentState {
		return { ...this.currentState };
	}

	/** Set the abort flag to cancel the currently running agent. */
	abort(): void {
		this.eventBus.abort();
	}

	/**
	 * Non-streaming: run the full agent loop using generateText and return the
	 * final result. Errors are returned on the result (`finishReason: 'error'`,
	 * `error` field) rather than thrown, so callers always receive a
	 * `GenerateResult`. The streaming path (`stream()`) emits error + finish
	 * chunks instead.
	 */
	async generate(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<GenerateResult> {
		const abortScope = this.eventBus.createAbortScope(options?.abortSignal);
		let list: AgentMessageList | undefined = undefined;
		try {
			const initializedList = await this.initRun(input, options);
			list = initializedList;
			const sink = new GenerateSink(this.createRunServices());
			const rawResult = await this.telemetry.withRootSpan(
				'generate',
				options,
				this.runId,
				async () =>
					await this.runAgentLoop<GenerateResult>(
						{ list: initializedList, options, abortScope },
						sink,
					),
			);
			return this.finalizeGenerate(rawResult, list);
		} catch (error) {
			await this.telemetry.flush(options);
			const isAbort = abortScope.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			return {
				runId: this.runId,
				messages: list?.responseDelta() ?? [],
				finishReason: 'error',
				error,
				getState: () => this.getState(),
			};
		} finally {
			abortScope.dispose();
		}
	}

	/** Streaming: run the agent loop using streamText, yielding chunks in real time. */
	async stream(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<StreamResult> {
		const abortScope = this.eventBus.createAbortScope(options?.abortSignal);
		let list: AgentMessageList;
		try {
			list = await this.initRun(input, options);
		} catch (error) {
			const isAbort = abortScope.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			abortScope.dispose();
			return { runId: this.runId, stream: makeErrorStream(error), getState: () => this.getState() };
		}

		return {
			runId: this.runId,
			stream: this.startStream({ list, options, abortScope }),
			getState: () => this.getState(),
		};
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
		options: { runId: string; toolCallId: string } & ExecutionOptions,
	): Promise<GenerateResult>;
	async resume(
		method: 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string } & ExecutionOptions,
	): Promise<StreamResult>;
	async resume(
		method: 'generate' | 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string } & ExecutionOptions,
	): Promise<GenerateResult | StreamResult> {
		this.runId = options.runId;
		const state = await this.runState.resume(this.runId);
		if (!state) throw new Error(`No suspended run found for runId: ${this.runId}`);

		const toolCall = state.pendingToolCalls[options.toolCallId];
		if (!toolCall) throw new Error(`No tool call found for toolCallId: ${options.toolCallId}`);

		const list = AgentMessageList.deserialize(state.messageList);
		this.context.hydrateDeferredToolsFromList(list);

		const toolForValidation = this.context
			.getCurrentTools(state.persistence)
			.find((t) => t.name === toolCall.toolName);
		if (!toolForValidation) throw new Error(`Tool ${toolCall.toolName} not found`);

		let resumeData: unknown = data;
		let abortScope: AgentAbortScope | undefined;

		if (!isCancellation(resumeData) && toolForValidation.resumeSchema) {
			const parseResult = await parseWithSchema(toolForValidation.resumeSchema, data);
			if (!parseResult.success) {
				throw new Error(`Invalid resume payload: ${parseResult.error}`);
			}
			resumeData = parseResult.data as JSONValue;
		}

		try {
			// Merge persisted execution options with fresh caller options
			const { runId: _rid, toolCallId: _tcid, ...callerExecOptions } = options;
			const persisted = state.executionOptions ?? {};
			const persistedMaxIterations = persisted.maxIterations;
			const callerMaxIterations = callerExecOptions.maxIterations;
			if (
				callerMaxIterations !== undefined &&
				persistedMaxIterations !== undefined &&
				callerMaxIterations < persistedMaxIterations
			) {
				throw new Error(
					`Cannot decrease maxIterations when resuming a run. Expected >= ${persistedMaxIterations}, received ${callerMaxIterations}.`,
				);
			}

			const mergedMaxIterations = callerMaxIterations ?? persistedMaxIterations;
			const mergedExecOptions: ExecutionOptions & { iterationCount?: number } = {
				...callerExecOptions,
				...(mergedMaxIterations !== undefined ? { maxIterations: mergedMaxIterations } : {}),
				...(state.iterationCount !== undefined ? { iterationCount: state.iterationCount } : {}),
			};

			const tool = this.context
				.getCurrentTools(state.persistence, mergedExecOptions.executionCounter)
				.find((t) => t.name === toolCall.toolName);
			if (!tool) throw new Error(`Tool ${toolCall.toolName} not found`);

			const resumeOptions: RuntimeExecutionOptions = {
				persistence: state.persistence,
				...mergedExecOptions,
			};

			abortScope = this.eventBus.createAbortScope(resumeOptions.abortSignal);
			const activeAbortScope = abortScope;

			const pendingResume: PendingResume = {
				pendingToolCalls: state.pendingToolCalls,
				resumeToolCallId: options.toolCallId,
				resumeData,
			};

			await this.ensureModelCost();

			await this.memory.setListObservationLogMemory(list, state.persistence);

			if (method === 'generate') {
				const sink = new GenerateSink(this.createRunServices());
				const rawResult = await this.telemetry.withRootSpan(
					'generate',
					resumeOptions,
					this.runId,
					async () =>
						await this.runAgentLoop<GenerateResult>(
							{
								list,
								options: resumeOptions,
								abortScope: activeAbortScope,
								pendingResume,
							},
							sink,
						),
				);
				try {
					return this.finalizeGenerate(rawResult, list);
				} finally {
					abortScope.dispose();
				}
			}

			return {
				runId: this.runId,
				stream: this.startStream({
					list,
					options: resumeOptions,
					abortScope: activeAbortScope,
					pendingResume,
				}),
				getState: () => this.getState(),
			};
		} catch (error) {
			const isAbort = abortScope?.isAborted ?? false;
			abortScope?.dispose();
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			if (method === 'generate') {
				return {
					runId: this.runId,
					messages: [],
					finishReason: 'error' as const,
					error,
					getState: () => this.getState(),
				};
			}
			return { runId: this.runId, stream: makeErrorStream(error), getState: () => this.getState() };
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
		input: AgentMessage[],
		options?: RunOptions & ExecutionOptions,
	): Promise<AgentMessageList> {
		const list = new AgentMessageList();
		await this.memory.loadInto(list, options);
		list.addInput(input);

		// Persist input now (after history load, so the prompt isn't polluted) so it
		// survives an abort or abandoned HITL suspend that never reaches finishComplete.
		// Best-effort: persistInputMessages swallows failures — the end-of-turn save
		// is authoritative for completed turns, so this must not abort the turn.
		await this.memory.persistInputMessages(list, options);

		return list;
	}

	/**
	 * Common setup for generate() and stream(): reset abort state, transition to running,
	 * emit AgentStart, fetch model cost, normalize input, and build the message list.
	 * Throws if buildMessageList fails; callers catch and handle the error.
	 */
	private async initRun(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<AgentMessageList> {
		this.updateState({
			status: 'running',
			persistence: options?.persistence,
		});
		this.eventBus.emit({ type: AgentEvent.AgentStart });
		await this.ensureModelCost();
		const normalizedInput = normalizeInput(input);
		incrementMessageCount(options?.executionCounter);
		return await this.buildMessageList(normalizedInput, options);
	}

	/**
	 * Post-loop finalization for generate: apply cost, set model id, roll up sub-agent usage,
	 * transition to success, and emit AgentEnd. Returns the finalized result.
	 */
	private finalizeGenerate(result: GenerateResult, list: AgentMessageList): GenerateResult {
		result.runId = this.runId;
		result.usage = this.applyCost(result.usage);
		result.model = this.modelIdString;
		this.updateState({ status: 'success', messageList: list.serialize() });
		this.eventBus.emit({ type: AgentEvent.AgentEnd, messages: result.messages });
		return { ...result, getState: () => this.getState() };
	}

	private buildAiSdkOptions(
		toolMap: Map<string, BuiltTool>,
		options?: ExecutionOptions,
	): {
		experimental_telemetry?: TelemetrySettings;
		experimental_repairToolCall?: ToolCallRepairFunction<NoInfer<ToolSet>>;
		experimental_onStepStart?: ExecutionOptions['onStepStart'];
		onStepFinish?: ExecutionOptions['onStepFinish'];
	} {
		return {
			...this.telemetry.buildTelemetryOptions(options),
			...(options?.onStepStart ? { experimental_onStepStart: options.onStepStart } : {}),
			...(options?.onStepFinish ? { onStepFinish: options.onStepFinish } : {}),
			experimental_repairToolCall: async (options) => {
				return await fixToolCall(
					{
						toolCall: options.toolCall,
						error: options.error,
					},
					toolMap,
				);
			},
		};
	}

	/** Throw (and mark the run cancelled) if the abort scope has fired. */
	private assertNotAborted(abortScope: AgentAbortScope): void {
		if (abortScope.isAborted) {
			this.updateState({ status: 'cancelled' });
			throw new Error('Agent run was aborted');
		}
	}

	/** Build the shared services the output sinks call into for terminal concerns. */
	private createRunServices(): RunServices {
		return {
			runId: this.runId,
			modelId: this.modelIdString,
			applyCost: (usage) => this.applyCost(usage),
			saveToMemory: async (list, options) => await this.memory.saveToMemory(list, options),
			maybeGenerateTitle: async (list, options) => await this.maybeGenerateTitle(list, options),
			flushTelemetry: async (options) => await this.telemetry.flush(options),
			cleanupRun: async () => await this.cleanupRun(),
			updateState: (patch) => this.updateState(patch),
			emitAgentEnd: (messages) => this.eventBus.emit({ type: AgentEvent.AgentEnd, messages }),
			getState: () => this.getState(),
		};
	}

	/** Fire-and-forget (or sync, if configured) thread-title generation at end of turn. */
	private async maybeGenerateTitle(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		if (!this.config.titleGeneration || !options?.persistence?.threadId || !this.config.memory) {
			return;
		}
		const titlePromise = generateThreadTitle({
			memory: this.config.memory,
			threadId: options.persistence.threadId,
			resourceId: options.persistence.resourceId,
			titleConfig: this.config.titleGeneration,
			agentModel: this.config.model,
			modelFetch: this.config.modelFetch,
			turnDelta: list.turnDelta(),
			executionCounter: options.executionCounter,
		});
		this.backgroundTasks.track(titlePromise);
		if (this.config.titleGeneration.sync) {
			await titlePromise;
		}
	}

	/**
	 * Single agentic loop shared by generate and stream. The `sink` adapts the
	 * loop to its output channel: running the LLM call, emitting tool-batch
	 * results, and producing the terminal result for suspension / completion.
	 *
	 * Aborts throw `Agent run was aborted` (checked at the loop top, after the
	 * model call, and after each tool batch); model and tool-batch errors
	 * propagate. Callers (generate's try/catch, the stream session) translate
	 * those throws into their terminal contract.
	 */
	private async runAgentLoop<T>(ctx: LoopContext, sink: RunOutputSink<T>): Promise<T> {
		const { list, options, abortScope, pendingResume } = ctx;
		this.context.hydrateDeferredToolsFromList(list);

		let totalUsage: TokenUsage | undefined;
		let lastFinishReason: FinishReason = 'stop';
		let structuredOutput: unknown;
		const runTelemetry = this.telemetry.resolve(options);
		const staticLoopContext = this.context.buildStaticLoopContext({
			...options,
			persistence: options?.persistence,
		});
		const maxIterations = options?.maxIterations ?? MAX_LOOP_ITERATIONS;
		let iterationCount = options?.iterationCount ?? 0;
		let reachedStopCondition = false;

		const buildToolBatchContext = (toolMap: Map<string, BuiltTool>): ToolBatchContext => ({
			toolMap,
			list,
			runId: this.runId,
			persistence: options?.persistence,
			telemetry: runTelemetry,
			executionCounter: options?.executionCounter,
			abortSignal: abortScope.signal,
			isAborted: () => abortScope.isAborted,
		});

		if (pendingResume) {
			const pendingLoopContext = this.context.buildToolLoopContext(
				staticLoopContext.aiProviderTools,
				options?.persistence,
				options?.executionCounter,
			);
			const batch = await this.toolExecutor.iteratePendingToolCallsConcurrent({
				...buildToolBatchContext(pendingLoopContext.toolMap),
				pendingResume,
			});
			await sink.emitToolBatch(batch);

			if (Object.keys(batch.pending).length > 0) {
				const suspendRunId = await this.persistSuspension(
					batch.pending,
					options,
					list,
					totalUsage,
					maxIterations,
					iterationCount,
				);
				return await sink.finishSuspended({
					suspendRunId,
					list,
					usage: totalUsage,
					suspensions: batch.suspensions,
				});
			}
		}

		for (; iterationCount < maxIterations; iterationCount++) {
			this.assertNotAborted(abortScope);

			this.eventBus.emit({ type: AgentEvent.TurnStart });

			const { toolMap, aiTools, hasTools, effectiveInstructions } =
				this.context.buildToolLoopContext(
					staticLoopContext.aiProviderTools,
					options?.persistence,
					options?.executionCounter,
				);
			const { system, messages } = list.forLlm(
				effectiveInstructions,
				this.config.instructionProviderOptions,
			);

			const turn = await sink.callModel({
				model: staticLoopContext.model,
				system,
				messages,
				abortSignal: abortScope.signal,
				hasTools,
				aiTools,
				providerOptions: staticLoopContext.providerOptions,
				outputSpec: staticLoopContext.outputSpec,
				aiSdkOptions: this.buildAiSdkOptions(toolMap, options),
			});

			// Fold the just-finished turn's usage in before the abort check so a
			// stop that lands right after the model call still bills its tokens.
			totalUsage = accumulateUsage(totalUsage, turn.usage);
			incrementTokenCountFromUsage(options?.executionCounter, turn.usage);
			sink.reportUsage(totalUsage);

			this.assertNotAborted(abortScope);

			lastFinishReason = turn.finishReason;
			list.addResponse(turn.newMessages);

			if (turn.aiFinishReason !== 'tool-calls') {
				structuredOutput = turn.structuredOutput;
				this.emitTurnEnd(turn.newMessages, extractSettledToolCalls(turn.newMessages));
				reachedStopCondition = true;
				break;
			}

			const batch = await this.toolExecutor.iterateToolCallsConcurrent({
				...buildToolBatchContext(toolMap),
				toolCalls: turn.toolCalls,
			});

			this.assertNotAborted(abortScope);

			await sink.emitToolBatch(batch);

			if (Object.keys(batch.pending).length > 0) {
				const suspendRunId = await this.persistSuspension(
					batch.pending,
					options,
					list,
					totalUsage,
					maxIterations,
					iterationCount + 1,
				);
				return await sink.finishSuspended({
					suspendRunId,
					list,
					usage: totalUsage,
					suspensions: batch.suspensions,
				});
			}

			// Emit TurnEnd after all tool calls in this iteration are processed
			this.emitTurnEnd(turn.newMessages, extractSettledToolCalls(list.responseDelta()));
		}

		if (!reachedStopCondition && iterationCount >= maxIterations) {
			lastFinishReason = 'max-iterations';
		}

		return await sink.finishComplete({
			list,
			options,
			finishReason: lastFinishReason,
			usage: totalUsage,
			structuredOutput,
		});
	}

	/**
	 * Wire up a ReadableStream and start the stream loop in the background via the
	 * StreamSession, which owns the single shutdown / cleanup path.
	 */
	private startStream(ctx: LoopContext): ReadableStream<StreamChunk> {
		let sink: StreamSink | undefined;
		return startStreamSession({
			eventBus: this.eventBus,
			abortScope: ctx.abortScope,
			runId: this.runId,
			options: ctx.options,
			withRootSpan: async (operation, options, runId, fn) =>
				await this.telemetry.withRootSpan(operation, options, runId, fn),
			runLoop: async (guard) => {
				sink = new StreamSink(guard, this.createRunServices(), ctx.options);
				await this.runAgentLoop(ctx, sink);
			},
			getAbortFinish: () => sink?.getAbortFinish() ?? {},
			flushTelemetry: async (options) => await this.telemetry.flush(options),
			cleanupRun: async () => await this.cleanupRun(),
			updateState: (status) => this.updateState({ status }),
			emitError: (error) =>
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error }),
		});
	}

	/**
	 * Persist a suspended run state and update the current state snapshot, and durably
	 * save the turn-so-far to thread memory so a suspended turn that is later cancelled or
	 * abandoned still leaves its assistant work behind. Returns the runtime's runId.
	 */
	private async persistSuspension(
		pendingToolCalls: Record<string, PendingToolCall>,
		options: RuntimeExecutionOptions | undefined,
		list: AgentMessageList,
		totalUsage: TokenUsage | undefined,
		maxIterations?: number,
		iterationCount?: number,
	): Promise<string> {
		// Persist loop controls only. providerOptions are intentionally excluded
		// because they may contain sensitive data (API keys, auth headers).
		const resolvedMaxIterations = maxIterations ?? options?.maxIterations;
		const resolvedIterationCount = iterationCount ?? options?.iterationCount;
		const executionOptions: PersistedExecutionOptions | undefined =
			resolvedMaxIterations !== undefined ? { maxIterations: resolvedMaxIterations } : undefined;

		const state: SerializableAgentState = {
			persistence: options?.persistence,
			status: 'suspended',
			messageList: list.serialize(),
			pendingToolCalls,
			usage: totalUsage,
			executionOptions,
			...(resolvedIterationCount !== undefined ? { iterationCount: resolvedIterationCount } : {}),
		};
		await this.runState.suspend(this.runId, state);
		this.updateState({ status: 'suspended', pendingToolCalls, messageList: list.serialize() });
		await this.memory.persistTurnOnSuspend(list, options);

		return this.runId;
	}

	/** Clean up stored state for a run when it finishes without re-suspending. */
	private async cleanupRun(): Promise<void> {
		await this.runState.complete(this.runId);
	}

	/** Emit a TurnEnd event when an assistant message is present in `newMessages`. */
	private emitTurnEnd(newMessages: AgentMessage[], toolResults: ContentToolCall[]): void {
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
		return getModelIdString(this.config.model);
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

	/**
	 * Configured telemetry handle (build-time). Run-time inheritance via
	 * `ExecutionOptions.telemetry` only applies inside an active
	 * agentic loop; out-of-band callers like `agent.reflect()` see the
	 * builder-time value.
	 */
	getConfiguredTelemetry(): BuiltTelemetry | undefined {
		return this.config.telemetry;
	}
}
