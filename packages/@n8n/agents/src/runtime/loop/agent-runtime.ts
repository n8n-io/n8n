import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { TelemetryOptions, ToolCallRepairFunction, ToolSet } from 'ai';

import {
	buildCheckpointOptions,
	markSuspendedToolCalls,
	mergeResumeExecutionOptions,
	mergeResumePersistence,
	parseResumeData,
} from './checkpoint-data';
import { incrementMessageCount, incrementTokenCountFromUsage } from './execution-counter';
import { GenerateSink } from './generate-sink';
import { hydrateFileParts } from './hydrate-file-parts';
import type {
	ModelCallContext,
	ModelTurnResult,
	RunOutputSink,
	RunServices,
} from '../../types/runtime/agent-loop';
import { RuntimeContextBuilder, type StaticLoopContext } from './runtime-context';
import {
	extractSettledToolCalls,
	formatMcpConnectionNote,
	isEmptyModelTurn,
	isReasoningOnlyStop,
	makeErrorStream,
	mergeUsage,
	normalizeInput,
} from './runtime-helpers';
import { StreamSink } from './stream-sink';
import { computeCost, getModelCost, type ModelCost } from '../../sdk/catalog';
import type {
	BuiltTelemetry,
	BuiltTool,
	FinishReason,
	GenerateResult,
	PendingToolCall,
	RunOptions,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
	TokenUsage,
} from '../../types';
import type { AgentRuntimeConfig } from '../../types/runtime/agent-runtime';
import { AgentEvent } from '../../types/runtime/event';
import type {
	AgentPersistenceOptions,
	ExecutionOptions,
	ResumeOptions,
} from '../../types/sdk/agent';
import type { AgentMessage, ContentToolCall } from '../../types/sdk/message';
import { getModelIdString } from '../../utils/model';
import { removeToolResultRun } from '../../workspace';
import { createFilteredLogger } from '../logger';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { generateThreadTitle } from '../memory/title-generation';
import { AgentMessageList, type SerializedMessageList } from '../model/message-list';
import { supportsSplitSystemMessages } from '../model/model-factory';
import { createModelTokenCounter } from '../model/model-token-counter';
import {
	applyRuntimeCacheBreakpoints,
	buildInstructionPromptCacheOptions,
	getEffectiveAnthropicCacheTtl,
	mergeProviderOptions,
} from '../model/prompt-cache';
import { ActiveSkills } from '../skills/active-skills';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus, type AgentAbortScope } from '../state/event-bus';
import { generateRunId, RunStateManager, StaleResumeError } from '../state/run-state';
import { startStreamSession } from '../streaming/stream-session';
import type { StreamWriterGuard } from '../streaming/stream-writer-guard';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';
import { DeferredToolManager } from '../tools/deferred-tool-manager';
import { fixToolCall } from '../tools/fix-tool-call';
import { ToolCallExecutor } from '../tools/tool-call-executor';
import type {
	PendingResume,
	ToolBatchContext,
	ToolCallBatchResult,
} from '../../types/runtime/tool-execution';

export type {
	AgentRuntimeConfig,
	VolatileInstructionsContext,
	VolatileInstructionsProvider,
} from '../../types/runtime/agent-runtime';

const MAX_LOOP_ITERATIONS = 100;

/** Retries for a `stop` turn that produced no output at all (see isEmptyModelTurn). */
const MAX_EMPTY_TURN_RETRIES = 2;
const logger = createFilteredLogger();

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
	isFreshRun?: boolean;
	options?: RuntimeExecutionOptions;
	abortScope: AgentAbortScope;
	pendingResume?: PendingResume;
}

interface PreparedLoopContext extends LoopContext {
	staticContext: StaticLoopContext;
	instructionProviderOptions: ProviderOptions | undefined;
	runTelemetry: BuiltTelemetry | undefined;
	canDiscardRejectedInput: boolean;
}

interface LoopState {
	totalUsage: TokenUsage | undefined;
	lastFinishReason: FinishReason;
	structuredOutput: unknown;
	maxIterations: number;
	iterationCount: number;
	reachedStopCondition: boolean;
}

type ToolBatchSettlement<T> = { suspended: false } | { suspended: true; result: T };

/**
 * Core agent execution engine using the Vercel AI SDK directly.
 *
 * - `generate()` uses `generateText()` — no streaming internally.
 * - `stream()` uses `streamText()` — yields chunks in real time.
 *
 * Memory strategy:
 * - `filterLlmMessages` strips custom messages before sending to the LLM.
 * - Memory stores all messages, but expires run-scoped offload locators.
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
	private activeSkills?: ActiveSkills;

	constructor(config: AgentRuntimeConfig) {
		this.config = config;
		// Keep full tool results when the memory backend cannot persist active skill IDs.
		if (config.skillSource && (!config.memory || config.memory.skillState)) {
			this.activeSkills = new ActiveSkills(
				config.skillSource,
				config.name,
				config.memory?.skillState,
			);
		}
		const tokenCounter = createModelTokenCounter(config.model);
		this.telemetry = new RuntimeTelemetry(config);
		this.runId = config.runId ?? generateRunId();
		if (config.deferredTools && config.deferredTools.length > 0) {
			this.deferredToolManager = new DeferredToolManager(config.deferredTools, {
				...config.toolSearch,
				// Let the discovery tools recognize the always-available toolset, so a
				// `load_tool` call for one of those answers `already_loaded`.
				activeTools: config.tools,
			});
		}
		this.context = new RuntimeContextBuilder(config, this.deferredToolManager);
		this.runState = config.runState ?? new RunStateManager(config.checkpointStorage);
		this.eventBus = config.eventBus ?? new AgentEventBus();
		this.memory = new MemoryOrchestrator(
			config,
			this.backgroundTasks,
			this.eventBus,
			this.telemetry,
			tokenCounter,
		);
		this.toolExecutor = new ToolCallExecutor({
			telemetry: this.telemetry,
			eventBus: this.eventBus,
			concurrency: config.toolCallConcurrency ?? 1,
			onCancelled: () => this.updateState({ status: 'cancelled' }),
			tokenCounter,
			...(config.workspaceFilesystem ? { workspaceFilesystem: config.workspaceFilesystem } : {}),
			...(this.activeSkills ? { loadSkill: this.activeSkills.load.bind(this.activeSkills) } : {}),
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
			const sink = new GenerateSink(this.createRunServices());
			// initRun runs inside the root span (not before it) so the history-load
			// and eager-input-persist memory spans it creates nest under
			// `<agent>.generate` instead of starting as detached root spans.
			const { result: rawResult, list: builtList } = await this.telemetry.withRootSpan(
				'generate',
				options,
				this.runId,
				async () => {
					const initializedList = await this.initRun(input, options);
					list = initializedList;
					const result = await this.runAgentLoop<GenerateResult>(
						{ list: initializedList, options, abortScope, isFreshRun: true },
						sink,
					);
					return { result, list: initializedList };
				},
			);
			list = builtList;
			return this.finalizeGenerate(rawResult, list);
		} catch (error) {
			const isAbort = abortScope.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (isAbort) {
				// Durably save the turn-so-far so a cancelled run still leaves its assistant
				// work in memory (mirrors the suspend-time save). Best-effort.
				if (list) await this.memory.persistTurnDelta(list, options);
			} else {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			await this.cleanupRun();
			await this.telemetry.flush(options);
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
		// initRun runs inside startStream's root span (not before it) so the
		// history-load and eager-input-persist memory spans it creates nest
		// under `<agent>.stream` instead of starting as detached root spans.
		// A failure there now surfaces through the same async error path as a
		// loop failure (startStreamSession's catch), rather than a synchronous
		// makeErrorStream — which also means cleanupRun/flushTelemetry now run
		// on an init failure too, where they previously didn't.
		return await Promise.resolve({
			runId: this.runId,
			stream: this.startStream({ input, options, abortScope }),
			getState: () => this.getState(),
		});
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
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult>;
	async resume(
		method: 'stream',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<StreamResult>;
	async resume(
		method: 'generate' | 'stream',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult | StreamResult> {
		this.runId = options.runId;
		const { state, list, resumeData } = await this.prepareToolResume(data, options);
		let abortScope: AgentAbortScope | undefined;
		let resumeClaimed = false;

		try {
			// Merge persisted execution options with fresh caller options
			const {
				runId: _rid,
				toolCallId: _tcid,
				onResumeClaimed: _onResumeClaimed,
				hostMetadata,
				...callerExecOptions
			} = options;
			const mergedExecOptions = mergeResumeExecutionOptions(state, callerExecOptions);

			const claimed = await this.runState.claimResume(this.runId, state);
			if (!claimed) {
				throw new StaleResumeError(`Run ${this.runId} is not suspended. Cannot resume.`);
			}
			resumeClaimed = true;
			const resumeOptions: RuntimeExecutionOptions = {
				persistence: mergeResumePersistence(state.persistence, hostMetadata),
				...mergedExecOptions,
			};
			this.updateState({ persistence: resumeOptions.persistence });
			await options.onResumeClaimed?.();

			abortScope = this.eventBus.createAbortScope(resumeOptions.abortSignal);
			const activeAbortScope = abortScope;

			const pendingResume: PendingResume = {
				pendingToolCalls: state.pendingToolCalls,
				resumeToolCallId: options.toolCallId,
				resumeData,
			};

			await this.prepareResumeMemory(list, state.persistence);

			const ctx: LoopContext = {
				list,
				options: resumeOptions,
				abortScope: activeAbortScope,
				pendingResume,
			};
			if (method === 'generate') return await this.generateResumedRun(ctx);
			return this.createResumedStream(ctx);
		} catch (error) {
			return await this.handleResumeFailure(method, error, abortScope, resumeClaimed);
		}
	}

	/**
	 * Durable-log RFC (resilience phase): re-drive a run from a `running`-status
	 * step checkpoint after a process crash. Unlike resume(), there is no
	 * pending tool call to settle — the checkpoint was written at a step
	 * boundary — so the loop re-enters directly at the next model call.
	 * `contextNotes` are appended as user messages before the model call: the
	 * host uses them to surface interrupted tool calls ("effect unverified —
	 * verify before retrying") and undrained steering corrections recovered
	 * from its durable event log. Tool calls are never re-executed mechanically.
	 */
	async crashResume(
		options: { runId: string; contextNotes?: string[] } & ExecutionOptions,
	): Promise<StreamResult> {
		this.runId = options.runId;
		const state = await this.loadStepCheckpoint();

		const list = await this.restoreCheckpointMessages(state);

		let abortScope: AgentAbortScope | undefined;
		try {
			const { runId: _rid, contextNotes, ...callerExecOptions } = options;
			const resumeOptions: RuntimeExecutionOptions = {
				persistence: state.persistence,
				...mergeResumeExecutionOptions(state, callerExecOptions),
			};

			for (const note of contextNotes ?? []) {
				list.addInput([{ role: 'user', content: [{ type: 'text', text: note }] }]);
			}

			abortScope = this.eventBus.createAbortScope(resumeOptions.abortSignal);
			const activeAbortScope = abortScope;

			await this.prepareResumeMemory(list, state.persistence);

			return this.createResumedStream({
				list,
				options: resumeOptions,
				abortScope: activeAbortScope,
			});
		} catch (error) {
			const isAbort = abortScope?.isAborted ?? false;
			abortScope?.dispose();
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			return { runId: this.runId, stream: makeErrorStream(error), getState: () => this.getState() };
		}
	}

	// --- Private ---

	private async prepareToolResume(data: unknown, options: ResumeOptions & ExecutionOptions) {
		const state = await this.runState.resume(this.runId);
		if (!state) {
			throw new StaleResumeError(`No suspended run found for runId: ${this.runId}`);
		}

		const toolCall = state.pendingToolCalls[options.toolCallId];
		if (!toolCall) {
			throw new StaleResumeError(`No tool call found for toolCallId: ${options.toolCallId}`);
		}
		if (options.hostMetadata !== undefined && !state.persistence) {
			throw new Error('Cannot update host metadata without persistence');
		}

		const list = await this.restoreCheckpointMessages(state);

		const tool = this.context
			.getCurrentTools(state.persistence)
			.find((t) => t.name === toolCall.toolName);
		if (!tool) throw new Error(`Tool ${toolCall.toolName} not found`);

		const resumeSchema = toolCall.suspended ? toolCall.resumeSchema : tool.resumeSchema;
		const resumeData = await parseResumeData(data, resumeSchema);
		return { state, list, resumeData };
	}

	private async handleResumeFailure(
		method: 'generate' | 'stream',
		error: unknown,
		abortScope: AgentAbortScope | undefined,
		resumeClaimed: boolean,
	): Promise<GenerateResult | StreamResult> {
		const isAbort = abortScope?.isAborted ?? false;
		abortScope?.dispose();
		if (error instanceof StaleResumeError) throw error;

		this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
		if (!isAbort) {
			this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
		}
		if (resumeClaimed) await this.cleanupRun();
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

	private async restoreCheckpointMessages(
		state: SerializableAgentState,
	): Promise<AgentMessageList> {
		const list = AgentMessageList.deserialize(state.messageList);
		this.context.hydrateDeferredToolsFromList(list);
		await hydrateFileParts(list.messages(), this.config.fileStore, {
			threadId: state.persistence?.threadId,
		});
		return list;
	}

	private async prepareResumeMemory(
		list: AgentMessageList,
		persistence: AgentPersistenceOptions | undefined,
	): Promise<void> {
		await this.ensureModelCost();

		await this.memory.setListObservationLogMemory(list, persistence);
		// The mask boundary is runtime-only state: re-derive it from the
		// persisted cursor so a run that compacted mid-run before suspending
		// does not resume with the full pre-compaction window.
		await this.memory.applyObservationMask(list, persistence);
	}

	private async generateResumedRun(ctx: LoopContext): Promise<GenerateResult> {
		const sink = new GenerateSink(this.createRunServices());
		const rawResult = await this.telemetry.withRootSpan(
			'generate',
			ctx.options,
			this.runId,
			async () => await this.runAgentLoop<GenerateResult>(ctx, sink),
		);
		try {
			return this.finalizeGenerate(rawResult, ctx.list);
		} finally {
			ctx.abortScope.dispose();
		}
	}

	private createResumedStream(ctx: LoopContext): StreamResult {
		return {
			runId: this.runId,
			stream: this.startStream(ctx),
			getState: () => this.getState(),
		};
	}

	private async loadStepCheckpoint(): Promise<SerializableAgentState> {
		const state = await this.runState.loadForCrashResume(this.runId);
		if (!state) throw new Error(`No checkpoint found for runId: ${this.runId}`);
		if (state.status !== 'running') {
			throw new Error(
				`Checkpoint for runId ${this.runId} has status '${state.status}' — crashResume only accepts step checkpoints; use resume() for suspended runs`,
			);
		}
		// A claimed HITL resume also persists as 'running' but still carries its
		// pending tool calls; re-driving it would skip settling them. Step
		// checkpoints are always written with empty pendingToolCalls.
		if (Object.keys(state.pendingToolCalls).length > 0) {
			throw new Error(
				`Checkpoint for runId ${this.runId} has pending tool calls — crashResume only accepts step checkpoints`,
			);
		}
		return state;
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

		// Hydrate after the eager persist so stored input stays reference-only.
		await hydrateFileParts(list.messages(), this.config.fileStore, {
			threadId: options?.persistence?.threadId,
		});

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
		if (!result.pendingSuspend?.length) {
			this.updateState({ status: 'success', messageList: list.serialize() });
			this.eventBus.emit({ type: AgentEvent.AgentEnd, messages: result.messages });
		}
		return { ...result, getState: () => this.getState() };
	}

	private buildAiSdkOptions(
		toolMap: Map<string, BuiltTool>,
		options?: ExecutionOptions,
	): {
		telemetry?: TelemetryOptions;
		repairToolCall?: ToolCallRepairFunction<NoInfer<ToolSet>>;
		onStepStart?: ExecutionOptions['onStepStart'];
		onStepEnd?: ExecutionOptions['onStepEnd'];
	} {
		return {
			...this.telemetry.buildTelemetryOptions(options),
			...(options?.onStepStart ? { onStepStart: options.onStepStart } : {}),
			...(options?.onStepEnd || options?.onStepFinish
				? { onStepEnd: options.onStepEnd ?? options.onStepFinish }
				: {}),
			repairToolCall: async (options) => {
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
		const { prepared, state } = await this.prepareLoop(ctx);
		if (prepared.pendingResume) {
			const settlement = await this.resumePendingTools(
				prepared,
				sink,
				state,
				prepared.pendingResume,
			);
			if (settlement.suspended) return settlement.result;
		}

		for (; state.iterationCount < state.maxIterations; state.iterationCount++) {
			const settlement = await this.runLoopIteration(prepared, sink, state);
			if (settlement.suspended) return settlement.result;
			if (state.reachedStopCondition) break;
		}

		if (!state.reachedStopCondition && state.iterationCount >= state.maxIterations) {
			state.lastFinishReason = 'max-iterations';
		}
		return await sink.finishComplete({
			list: ctx.list,
			options: ctx.options,
			finishReason: state.lastFinishReason,
			usage: state.totalUsage,
			structuredOutput: state.structuredOutput,
		});
	}

	private async prepareLoop(ctx: LoopContext): Promise<{
		prepared: PreparedLoopContext;
		state: LoopState;
	}> {
		const { list, options } = ctx;
		await this.activeSkills?.restore(list, options?.persistence);
		this.context.hydrateDeferredToolsFromList(list);
		// This note reaches the model but is not stored in conversation history.
		list.mcpConnectionNote = formatMcpConnectionNote(this.config.mcpConnectionFailures ?? []);

		const runTelemetry = this.telemetry.resolve(options);
		const staticContext = this.context.buildStaticLoopContext({
			...options,
			persistence: options?.persistence,
		});
		// Explicit instruction options take precedence over cache defaults.
		const instructionProviderOptions = mergeProviderOptions(
			buildInstructionPromptCacheOptions(this.config.promptCaching, this.modelIdString),
			this.config.instructionProviderOptions,
		);
		const state: LoopState = {
			totalUsage: undefined,
			lastFinishReason: 'stop',
			structuredOutput: undefined,
			maxIterations: options?.maxIterations ?? MAX_LOOP_ITERATIONS,
			iterationCount: options?.iterationCount ?? 0,
			reachedStopCondition: false,
		};
		return {
			prepared: {
				...ctx,
				runTelemetry,
				staticContext,
				instructionProviderOptions,
				canDiscardRejectedInput: this.canDiscardRejectedInput(ctx),
			},
			state,
		};
	}

	private canDiscardRejectedInput(ctx: LoopContext): boolean {
		const inputMessages = new Set(ctx.list.inputDelta());
		const inputIds = new Set([...inputMessages].map((message) => message.id));
		return (
			ctx.isFreshRun === true &&
			[...inputMessages].some(
				(message) =>
					'role' in message &&
					message.role === 'user' &&
					Array.isArray(message.content) &&
					message.content.some((part) => part.type === 'file' && part.data !== undefined),
			) &&
			!ctx.list
				.messages()
				.some((message) => !inputMessages.has(message) && inputIds.has(message.id))
		);
	}

	private buildToolBatchContext(
		ctx: PreparedLoopContext,
		toolMap: Map<string, BuiltTool>,
	): ToolBatchContext {
		return {
			toolMap,
			list: ctx.list,
			runId: this.runId,
			persistence: ctx.options?.persistence,
			telemetry: ctx.runTelemetry,
			executionCounter: ctx.options?.executionCounter,
			abortSignal: ctx.abortScope.signal,
			isAborted: () => ctx.abortScope.isAborted,
		};
	}

	private async resumePendingTools<T>(
		ctx: PreparedLoopContext,
		sink: RunOutputSink<T>,
		state: LoopState,
		pendingResume: PendingResume,
	): Promise<ToolBatchSettlement<T>> {
		const { toolMap } = this.context.buildToolLoopContext(
			ctx.staticContext.aiProviderTools,
			ctx.options?.persistence,
			ctx.options?.executionCounter,
			ctx.list,
		);
		const batch = await this.toolExecutor.iteratePendingToolCallsConcurrent({
			...this.buildToolBatchContext(ctx, toolMap),
			pendingResume,
		});
		const settlement = await this.finishToolBatch(
			ctx,
			sink,
			state,
			batch,
			toolMap,
			state.iterationCount,
		);
		if (settlement.suspended) return settlement;
		// Resumed tool results form a new observation boundary before the next model call.
		await this.memory.maybeObserveMidRun(ctx.list, ctx.options);
		return settlement;
	}

	private async runLoopIteration<T>(
		ctx: PreparedLoopContext,
		sink: RunOutputSink<T>,
		state: LoopState,
	): Promise<ToolBatchSettlement<T>> {
		this.assertNotAborted(ctx.abortScope);
		this.eventBus.emit({ type: AgentEvent.TurnStart });
		const { toolMap, modelCallContext } = await this.prepareModelCall(ctx, state.iterationCount);
		const turn = await this.callModelWithRetries(ctx, sink, state, modelCallContext);
		this.assertNotAborted(ctx.abortScope);

		state.lastFinishReason = turn.finishReason;
		if (!isReasoningOnlyStop(turn)) ctx.list.addResponse(turn.newMessages);
		// Drop retained stream text only after the response is in the list.
		sink.onTurnFolded?.();

		if (turn.aiFinishReason !== 'tool-calls') {
			if (turn.errorReason) throw new Error(turn.errorReason.message);
			state.structuredOutput = turn.structuredOutput;
			this.emitTurnEnd(turn.newMessages, extractSettledToolCalls(turn.newMessages));
			state.reachedStopCondition = true;
			return { suspended: false };
		}

		const batch = await this.toolExecutor.iterateToolCallsConcurrent({
			...this.buildToolBatchContext(ctx, toolMap),
			toolCalls: turn.toolCalls,
		});
		const settlement = await this.finishToolBatch(
			ctx,
			sink,
			state,
			batch,
			toolMap,
			state.iterationCount + 1,
		);
		if (settlement.suspended) return settlement;
		await this.completeToolTurn(ctx, state, turn);
		return settlement;
	}

	private async prepareModelCall(ctx: PreparedLoopContext, iterationCount: number) {
		const { list, options, abortScope, staticContext } = ctx;
		for (const toolName of this.activeSkills?.toolDependencies() ?? []) {
			this.deferredToolManager?.load(toolName);
		}
		const tools = this.context.buildToolLoopContext(
			staticContext.aiProviderTools,
			options?.persistence,
			options?.executionCounter,
			list,
		);
		const hostVolatileInstructions = await this.resolveVolatileInstructions(options?.persistence);
		const { system, messages } = this.buildModelPrompt(ctx, tools, hostVolatileInstructions);
		// Cache breakpoints apply to this call only. Do not change stored messages or tools.
		const cached = applyRuntimeCacheBreakpoints({
			system,
			messages: this.activeSkills?.modelMessages(messages, list) ?? messages,
			aiTools: tools.aiTools,
			promptCaching: this.config.promptCaching,
			modelId: this.modelIdString,
			staticToolCacheName: tools.staticToolCacheName,
		});
		const modelCallContext: ModelCallContext = {
			model: staticContext.model,
			system,
			messages: cached.messages,
			abortSignal: abortScope.signal,
			hasTools: tools.hasTools,
			aiTools: cached.aiTools,
			reasoning: staticContext.reasoning,
			providerOptions: staticContext.providerOptions,
			outputSpec: staticContext.outputSpec,
			maxOutputTokens: staticContext.maxOutputTokens,
			aiSdkOptions: this.buildAiSdkOptions(tools.toolMap, options),
			onInputRejected: this.createInputRejectionHandler(ctx, iterationCount),
		};
		return { toolMap: tools.toolMap, modelCallContext };
	}

	private buildModelPrompt(
		ctx: PreparedLoopContext,
		tools: ReturnType<RuntimeContextBuilder['buildToolLoopContext']>,
		hostVolatileInstructions: string | undefined,
	) {
		const combinedVolatileInstructions = [tools.volatileInstructions, hostVolatileInstructions]
			.map((value) => value?.trim())
			.filter((value): value is string => Boolean(value))
			.join('\n\n');
		return ctx.list.forLlm(
			// Skill content changes only on activation. Keep it cached when memory compacts.
			[tools.effectiveInstructions, this.activeSkills?.instructions()]
				.filter(Boolean)
				.join('\n\n'),
			ctx.instructionProviderOptions,
			combinedVolatileInstructions || undefined,
			supportsSplitSystemMessages(this.config.model),
		);
	}

	private createInputRejectionHandler(
		ctx: PreparedLoopContext,
		iterationCount: number,
	): ModelCallContext['onInputRejected'] {
		if (!ctx.canDiscardRejectedInput || iterationCount !== 0) return undefined;
		return async () => {
			if (ctx.abortScope.isAborted) return;
			await this.memory.discardRejectedInput(ctx.list, ctx.options);
			this.updateState({ messageList: ctx.list.serialize() });
		};
	}

	private async callModelWithRetries<T>(
		ctx: PreparedLoopContext,
		sink: RunOutputSink<T>,
		state: LoopState,
		modelCallContext: ModelCallContext,
	): Promise<ModelTurnResult> {
		let turn = await sink.callModel(modelCallContext);
		// Retry empty stop turns. Charge each attempt before checking for cancellation.
		for (let retry = 0; retry < MAX_EMPTY_TURN_RETRIES && isEmptyModelTurn(turn); retry++) {
			this.recordTurnUsage(ctx, sink, state, turn);
			this.assertNotAborted(ctx.abortScope);
			turn = await sink.callModel(modelCallContext);
		}
		this.recordTurnUsage(ctx, sink, state, turn);
		return turn;
	}

	private recordTurnUsage<T>(
		ctx: PreparedLoopContext,
		sink: RunOutputSink<T>,
		state: LoopState,
		turn: ModelTurnResult,
	): void {
		state.totalUsage = mergeUsage(state.totalUsage, turn.usage);
		incrementTokenCountFromUsage(ctx.options?.executionCounter, turn.usage);
		sink.reportUsage(state.totalUsage);
	}

	private async finishToolBatch<T>(
		ctx: PreparedLoopContext,
		sink: RunOutputSink<T>,
		state: LoopState,
		batch: ToolCallBatchResult,
		toolMap: Map<string, BuiltTool>,
		nextIteration: number,
	): Promise<ToolBatchSettlement<T>> {
		const { list, options, abortScope } = ctx;
		const hasPending = Object.keys(batch.pending).length > 0;
		let completed = false;
		try {
			this.assertNotAborted(abortScope);
			await sink.emitToolBatch(batch);
			this.assertNotAborted(abortScope);
			if (!hasPending) {
				completed = true;
				return { suspended: false };
			}
			await this.persistSuspension(
				batch.pending,
				options,
				list,
				state.totalUsage,
				state.maxIterations,
				nextIteration,
			);
			this.assertNotAborted(abortScope);
			const result = await sink.finishSuspended({
				suspendRunId: this.runId,
				list,
				usage: state.totalUsage,
				suspensions: batch.suspensions,
			});
			this.assertNotAborted(abortScope);
			completed = true;
			return { suspended: true, result };
		} finally {
			if (!completed && hasPending) await this.cleanupFailedSuspension(ctx, batch.pending, toolMap);
		}
	}

	private async cleanupFailedSuspension(
		ctx: PreparedLoopContext,
		pending: Record<string, PendingToolCall>,
		toolMap: Map<string, BuiltTool>,
	): Promise<void> {
		await this.toolExecutor.cleanupPendingToolCalls(
			pending,
			this.buildToolBatchContext(ctx, toolMap),
			ctx.abortScope.isAborted ? 'Run aborted' : 'Parent run failed before suspension',
		);
		try {
			await this.runState.cancel(this.runId, this.getState());
		} catch {
			// Preserve the failure that interrupted suspension finalization.
		}
	}

	private async completeToolTurn(
		ctx: PreparedLoopContext,
		state: LoopState,
		turn: ModelTurnResult,
	): Promise<void> {
		this.emitTurnEnd(turn.newMessages, extractSettledToolCalls(ctx.list.responseDelta()));
		// All tools have settled. Observe before the next call and its checkpoint.
		await this.memory.maybeObserveMidRun(ctx.list, ctx.options);
		if (ctx.options?.stepCheckpoints) {
			await this.persistStepCheckpoint(
				ctx.list,
				state.totalUsage,
				ctx.options,
				state.maxIterations,
				state.iterationCount + 1,
			);
		}
	}

	private async resolveVolatileInstructions(
		persistence: AgentPersistenceOptions | undefined,
	): Promise<string | undefined> {
		try {
			return await this.config.volatileInstructionsProvider?.({ persistence });
		} catch (error) {
			logger.warn('Failed to resolve volatile agent instructions', { runId: this.runId, error });
			return undefined;
		}
	}

	/**
	 * Wire up a ReadableStream and start the stream loop in the background via the
	 * StreamSession, which owns the single shutdown / cleanup path.
	 *
	 * Accepts either an already-built `list` (resume/crashResume, which restore
	 * it from persisted state) or raw `input` (a fresh `stream()` call) — in the
	 * latter case `initRun` builds the list from inside `runLoop`, i.e. inside
	 * the telemetry root span, so its memory spans nest correctly.
	 */
	private startStream(
		ctx: (
			| { list: AgentMessageList; input?: never }
			| { list?: never; input: AgentMessage[] | string }
		) & {
			options?: RuntimeExecutionOptions;
			abortScope: AgentAbortScope;
			pendingResume?: PendingResume;
		},
	): ReadableStream<StreamChunk> {
		let sink: StreamSink | undefined;
		let list: AgentMessageList | undefined = ctx.list;
		return startStreamSession({
			eventBus: this.eventBus,
			abortScope: ctx.abortScope,
			runId: this.runId,
			options: ctx.options,
			withRootSpan: async (operation, options, runId, fn) =>
				await this.telemetry.withRootSpan(operation, options, runId, fn),
			runLoop: async (guard) => {
				this.writeMcpConnectionWarnings(guard);
				const resolvedList = ctx.list ?? (await this.initRun(ctx.input, ctx.options));
				list = resolvedList;
				sink = new StreamSink(guard, this.createRunServices(), ctx.options);
				await this.runAgentLoop(
					{
						list: resolvedList,
						options: ctx.options,
						abortScope: ctx.abortScope,
						pendingResume: ctx.pendingResume,
						isFreshRun: ctx.list === undefined,
					},
					sink,
				);
			},
			getTerminalFinish: () => sink?.getTerminalFinish() ?? {},
			// Durably save the turn-so-far when a streaming run is aborted, so a cancelled
			// run still leaves its assistant work in memory. Fold in the text streamed for
			// the in-flight turn first — its `newMessages` are only built once the stream
			// completes, which the abort skipped, so it isn't in the list yet. No-op if
			// the run aborted before initRun finished building the list.
			persistTurnOnAbort: async () => {
				if (!list) return;
				const partial = sink?.getAbortSnapshot();
				if (partial) list.addResponse([partial]);
				await this.memory.persistTurnDelta(list, ctx.options);
			},
			flushTelemetry: async (options) => await this.telemetry.flush(options),
			cleanupRun: async () => await this.cleanupRun(),
			updateState: (status) => this.updateState({ status }),
			emitError: (error) =>
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error }),
		});
	}

	private writeMcpConnectionWarnings(guard: StreamWriterGuard): void {
		// Surface MCP connection failures as non-fatal warnings before the
		// first LLM step. Tools from these servers were skipped during
		// build(); the run continues with the remaining tools.
		for (const failure of this.config.mcpConnectionFailures ?? []) {
			void guard.write({
				type: 'warning',
				message: failure.error,
				code: 'mcp_connection_failed',
				source: 'mcp',
				server: failure.server,
			});
		}
	}

	/**
	 * Persist a suspended run state and update the current state snapshot, and durably
	 * save the turn-so-far to thread memory so a suspended turn that is later cancelled or
	 * abandoned still leaves its assistant work behind.
	 */
	private async persistSuspension(
		pendingToolCalls: Record<string, PendingToolCall>,
		options: RuntimeExecutionOptions | undefined,
		list: AgentMessageList,
		totalUsage: TokenUsage | undefined,
		maxIterations?: number,
		iterationCount?: number,
	): Promise<void> {
		const checkpointOptions = buildCheckpointOptions(options, maxIterations, iterationCount);

		markSuspendedToolCalls(list, pendingToolCalls);

		const state: SerializableAgentState = {
			persistence: options?.persistence,
			status: 'suspended',
			messageList: list.serialize(),
			pendingToolCalls,
			usage: totalUsage,
			...checkpointOptions,
		};
		await this.runState.suspend(this.runId, state);
		this.updateState({ status: 'suspended', pendingToolCalls, messageList: list.serialize() });
		await this.memory.persistTurnDelta(list, options);
	}

	/**
	 * Durable-log RFC (resilience phase): per-step checkpoint — the completion
	 * of the "step boundary = durability boundary" rule. Called at the end of
	 * each loop iteration (after tool results are appended to `list`, before
	 * the next model call), gated on the `stepCheckpoints` opt-in so the write
	 * cost is only paid where crash-resume matters. Reuses the suspension state
	 * shape; pendingToolCalls is empty at a step boundary.
	 */
	private async persistStepCheckpoint(
		list: AgentMessageList,
		totalUsage: TokenUsage | undefined,
		options: RuntimeExecutionOptions | undefined,
		maxIterations?: number,
		iterationCount?: number,
	): Promise<void> {
		const checkpointOptions = buildCheckpointOptions(options, maxIterations, iterationCount);

		const state: SerializableAgentState = {
			persistence: options?.persistence,
			status: 'running',
			messageList: list.serialize(),
			pendingToolCalls: {},
			usage: totalUsage,
			...checkpointOptions,
		};
		await this.runState.checkpointStep(this.runId, state);
	}

	/** Clean up stored state for a run when it finishes without re-suspending. */
	private async cleanupRun(): Promise<void> {
		try {
			await this.runState.complete(this.runId, this.getState());
		} catch (error) {
			logger.warn('Failed to clean up agent run checkpoint', { runId: this.runId, error });
			return;
		}

		// Gated on this runtime instance having offloaded something: with lazy sandbox
		// acquisition an unconditional cleanup would boot the sandbox just to find nothing.
		// Runs resumed in a fresh process skip this (flag is per-instance); their orphaned
		// run dirs are swept by reconcileToolResultRuns on a later acquisition.
		if (this.config.workspaceFilesystem && this.toolExecutor.hasOffloadedToolResults) {
			try {
				await removeToolResultRun(this.config.workspaceFilesystem, this.runId);
			} catch (error) {
				logger.warn('Failed to clean up agent run tool results', { runId: this.runId, error });
			}
		}
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
		const anthropicCacheTtl = getEffectiveAnthropicCacheTtl(
			this.config.promptCaching,
			this.modelIdString,
		);
		return { ...usage, cost: computeCost(usage, this.modelCost, { anthropicCacheTtl }) };
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
