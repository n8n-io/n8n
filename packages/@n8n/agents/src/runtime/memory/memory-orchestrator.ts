import {
	getEpisodicMemoryScope,
	hasEpisodicMemoryStore,
	isEpisodicMemoryEnabled,
	runEpisodicMemoryIndexer,
} from './episodic-memory';
import { createFilteredLogger } from '../logger';
import { compareKeyset, saveMessagesToThread } from './memory-store';
import {
	runObservationLogObserver,
	type ObservationLogObserverMemory,
	type RunObservationLogObserverResult,
} from './observation-log-observer';
import { runObservationLogReflector } from './observation-log-reflector';
import { renderObservationLog } from './observation-log-renderer';
import { hasObservationLogStore, hasObservationLogTaskLockStore } from './observation-log-store';
import {
	ScopedMemoryTaskRunner,
	type ScopedMemoryTaskHandle,
	type ScopedMemoryTaskResult,
} from './scoped-memory-task-runner';
import { settleOrphanedToolMessages } from './strip-orphaned-tool-messages';
import { getCreatedAt } from '../../sdk/message';
import type {
	AgentExecutionCounter,
	BuiltMemory,
	BuiltTelemetry,
	EpisodicMemoryTaskLockHandle,
	EpisodicMemoryTaskLockMethods,
} from '../../types';
import { AgentEvent } from '../../types/runtime/event';
import type { AgentPersistenceOptions, ExecutionOptions, RunOptions } from '../../types/sdk/agent';
import type { AgentDbMessage } from '../../types/sdk/message';
import type { ObservationLogScope, ObservationLogTaskKind } from '../../types/sdk/observation-log';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import type { AgentMessageList } from '../model/message-list';
import { estimateObservationTokens, type TokenCounter } from '../model/model-token-counter';
import type { BackgroundTaskTracker } from '../state/background-task-tracker';
import type { AgentEventBus } from '../state/event-bus';
import {
	inferMemoryStoreAttributes,
	withMemorySpan,
	type MemorySpanAttributes,
	type RuntimeTelemetry,
} from '../telemetry/runtime-telemetry';
import { sanitizeOffloadedToolResultsForMemory } from '../tools/tool-result-guard';

const DEFAULT_MEMORY_TASK_LOCK_TTL_MS = 30_000;
/** Fraction of observerThresholdTokens at which the mid-run observer starts in the background. */
const MID_RUN_SOFT_THRESHOLD_RATIO = 0.7;
/**
 * Consecutive observer attempts that failed to advance the cursor (provider
 * outage, lock contention, persistently unparseable output) before
 * mid-run observation stops retrying for the rest of the run. Without the
 * latch, the hard path would fire a blocking observer call at every loop
 * boundary. Post-turn observation is unaffected.
 */
const MID_RUN_MAX_NON_ADVANCING_ATTEMPTS = 3;
const logger = createFilteredLogger();

function stringifyForBudget(value: unknown): string {
	try {
		return JSON.stringify(value) ?? '';
	} catch {
		return '';
	}
}

function serializeMessageForBudget(message: AgentDbMessage): string {
	if (!('role' in message) || !Array.isArray(message.content)) return '';
	const parts: string[] = [];
	for (const content of message.content) {
		if (content.type === 'text') {
			parts.push(content.text);
		} else if (content.type === 'tool-call') {
			parts.push(content.toolName, stringifyForBudget(content.input));
			if (content.state === 'resolved') parts.push(stringifyForBudget(content.output));
			else if (content.state === 'rejected') parts.push(content.error);
		}
	}
	return parts.join('\n');
}

function hasFunctionProperty<K extends PropertyKey>(
	value: object,
	property: K,
): value is Record<K, (...args: never[]) => unknown> {
	return property in value && typeof Reflect.get(value, property) === 'function';
}

interface MidRunObserverTask {
	handle: ScopedMemoryTaskHandle<RunObservationLogObserverResult>;
	result?: ScopedMemoryTaskResult<RunObservationLogObserverResult>;
}

function didAdvanceCursor(
	result: ScopedMemoryTaskResult<RunObservationLogObserverResult>,
): boolean {
	return (
		result.status === 'completed' && result.value.status === 'ran' && result.value.cursorAdvanced
	);
}

function hasObservationLogObserverMemory(
	memory: BuiltMemory,
): memory is ObservationLogObserverMemory {
	return (
		hasObservationLogStore(memory) &&
		hasFunctionProperty(memory, 'getMessagesForObservationScope') &&
		hasFunctionProperty(memory, 'getCursor') &&
		hasFunctionProperty(memory, 'setCursor')
	);
}

/**
 * Owns all memory-store side effects for a single agent runtime: loading thread
 * history, seeding the live message list with the active observation log,
 * persisting the turn delta, and scheduling background observation-log and
 * episodic-memory indexing jobs.
 *
 */
export class MemoryOrchestrator {
	private memoryTasks: ScopedMemoryTaskRunner | undefined;

	private episodicMemoryTasksByResource = new Map<string, Promise<unknown>>();

	/**
	 * Per-message model-facing token estimates, cached by message id so
	 * observation gates never re-encode messages.
	 */
	private visibleTokenEstimates = new Map<string, number>();

	private visibleTokenEstimateTotal = 0;

	/** In-flight background mid-run observer task; `result` set on settlement. */
	private midRunObserverTask: MidRunObserverTask | undefined;

	/** Consecutive mid-run observer attempts that did not advance the cursor. */
	private midRunNonAdvancingAttempts = 0;

	/**
	 * Keyset high-water mark of turn messages already persisted mid-run;
	 * `persistTurnDelta` saves only the suffix after it.
	 */
	private lastPersistedTurnKeyset: { createdAt: Date; id: string } | undefined;

	constructor(
		private readonly config: AgentRuntimeConfig,
		private readonly backgroundTasks: BackgroundTaskTracker,
		private readonly eventBus: AgentEventBus,
		private readonly runtimeTelemetry: RuntimeTelemetry,
		private readonly tokenCounter: TokenCounter = estimateObservationTokens,
	) {}

	async loadHistoryMessages(
		persistence: AgentPersistenceOptions,
		telemetry?: BuiltTelemetry,
	): Promise<AgentDbMessage[]> {
		const memory = this.config.memory;

		if (!memory) return [];

		const { threadId, resourceId } = persistence;

		return await withMemorySpan(
			'query_memory',
			this.config.name,
			telemetry,
			() => ({ types: ['session'], owners: [resourceId], ...inferMemoryStoreAttributes(memory) }),
			async () => {
				if (this.config.observationalMemory && hasObservationLogObserverMemory(memory)) {
					const cursor = await memory.getCursor(threadId);

					// Trust the cursor only when an observation log actually stands in for
					// the pre-cursor messages. If the cursor advanced without observations
					// being persisted (cursor/observation desync), loading only
					// post-cursor messages would silently drop the entire prior
					// conversation, so we fall back to the full history instead.
					if (cursor && (await this.hasActiveObservations(memory, threadId))) {
						const messages = await memory.getMessagesForObservationScope(threadId, {
							since: {
								sinceCreatedAt: cursor.lastObservedAt,
								sinceMessageId: cursor.lastObservedMessageId,
							},
						});
						return { result: messages, attributes: this.queryResultAttributes(messages) };
					}
				}

				const messages = await memory.getMessages(threadId, { resourceId });
				return { result: messages, attributes: this.queryResultAttributes(messages) };
			},
		);
	}

	private queryResultAttributes(messages: AgentDbMessage[]): MemorySpanAttributes {
		return {
			ids: messages.map((m) => m.id),
			operations: messages.map(() => 'query_memory'),
			descriptions: messages.map(() => 'conversation history'),
		};
	}

	private async hasActiveObservations(
		memory: ObservationLogObserverMemory,
		threadId: string,
	): Promise<boolean> {
		const observations = await memory.getActiveObservationLog({
			observationScopeId: threadId,
			limit: 1,
			order: 'desc',
		});
		return observations.length > 0;
	}

	/**
	 * Load thread history (if memory + threadId are configured) into the list as
	 * the history set, stripping orphaned tool pairs, then seed the active
	 * observation log into the list's working memory.
	 */
	async loadInto(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		this.resetRunState();
		if (this.config.memory && options?.persistence?.threadId) {
			const telemetry = this.runtimeTelemetry.resolve(options);
			const memMessages = await this.loadHistoryMessages(options.persistence, telemetry);

			if (memMessages.length > 0) {
				// Settle (not strip) so an abandoned suspension stays visible as an
				// explicit "never completed" record instead of vanishing (INS-1223).
				list.addHistory(settleOrphanedToolMessages(memMessages));
			}
		}

		await this.setListObservationLogMemory(list, options?.persistence);
	}

	private async saveMessagesWithSpan(
		memory: BuiltMemory,
		threadId: string,
		resourceId: string,
		messages: AgentDbMessage[],
		telemetry: BuiltTelemetry | undefined,
	): Promise<void> {
		await withMemorySpan(
			'save_memory',
			this.config.name,
			telemetry,
			() => ({ types: ['session'], owners: [resourceId], ...inferMemoryStoreAttributes(memory) }),
			async () => {
				await saveMessagesToThread(memory, threadId, resourceId, messages);
				return {
					result: undefined,
					attributes: {
						ids: messages.map((m) => m.id),
						operations: messages.map(() => 'created' as const),
					},
				};
			},
		);
	}

	async setListObservationLogMemory(
		list: AgentMessageList,
		options: AgentPersistenceOptions | undefined,
	): Promise<void> {
		const memory = this.config.memory;
		if (!memory || !options?.threadId || !hasObservationLogStore(memory)) return;
		const scope = this.getObservationLogScope(options);
		const observations = await memory.getActiveObservationLog({
			...scope,
			order: 'asc',
		});
		list.observationLogMemory =
			renderObservationLog(observations, {
				renderTokenBudget: this.config.observationLog?.renderTokenBudget,
			}) ?? undefined;
		// Observations are stamped at observer run time, after the messages they
		// observed are persisted, so the latest observation's createdAt is a safe
		// upper bound on those messages' createdAt. Seeding the list's clock here
		// keeps new live messages ordered after the observer cursor's
		// lastObservedAt even when resource-filtered history did not surface them
		// (e.g. resources sharing a thread on fast back-to-back runs).
		if (observations.length > 0) {
			list.seedLastCreatedAt(observations[observations.length - 1].createdAt.getTime());
		}
	}

	/**
	 * Eagerly persist just this turn's input messages, before the turn completes.
	 * Skips the observation-log / episodic-memory jobs that `saveToMemory` schedules —
	 * those stay at end-of-turn. Idempotent with the end-of-turn save: both write the
	 * same message id, so TypeORM upserts a single row.
	 */
	async persistInputMessages(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		const memory = this.config.memory;
		if (!memory || !options?.persistence) return;
		const input = list.inputDelta();
		if (input.length === 0) return;
		try {
			const telemetry = this.runtimeTelemetry.resolve(options);
			await this.saveMessagesWithSpan(
				memory,
				options.persistence.threadId,
				options.persistence.resourceId,
				input,
				telemetry,
			);
		} catch (error) {
			// Best-effort: the end-of-turn save still persists the input on a
			// completed turn, so a transient failure here must not abort the turn.
			// Only an uncompleted turn whose eager save also failed loses the input.
			logger.warn('Failed to eagerly persist input messages', {
				error,
				threadId: options.persistence.threadId,
			});
			this.eventBus.emit({
				type: AgentEvent.Error,
				message: 'Failed to eagerly persist input messages',
				error,
				source: 'input-persistence',
			});
		}
	}

	/**
	 * Persist the turn-so-far before the turn reaches its end-of-turn save — on HITL
	 * suspend or on abort/cancel. Saves the full `turnDelta()` (input + accumulated
	 * response) so a turn that is suspended-then-abandoned, or cancelled mid-flight,
	 * still leaves its assistant work — the built workflow, resolved tool results — in
	 * memory. Like `persistInputMessages`, it skips the observation-log / episodic-memory
	 * / title jobs that `saveToMemory` schedules; those stay at end-of-turn. Idempotent
	 * with the end-of-turn save: ids are stable across serialize/deserialize, so both
	 * writes target the same rows and TypeORM upserts (pending tool-call → resolved in
	 * place). A still-pending tool-call left by an abort is settled on the next load
	 * (`settleOrphanedToolMessages`), so persisting an incomplete turn can't malform history.
	 */
	async persistTurnDelta(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		const memory = this.config.memory;
		if (!memory || !options?.persistence) return;
		// Mid-run boundaries can cross the observer threshold many times; without
		// the watermark each crossing would re-upsert the whole turn, quadratic in
		// turn length. The watermark is per-run state (reset on run entry) because
		// a suspension settles a pending tool call in place across runs — a resume
		// starts with a fresh watermark and re-persists the restored turn once.
		const watermark = this.lastPersistedTurnKeyset;
		const unpersisted = watermark
			? list.turnDelta().filter((m) => {
					const createdAt = getCreatedAt(m);
					return !createdAt || compareKeyset({ createdAt, id: m.id }, watermark) > 0;
				})
			: list.turnDelta();
		const delta = sanitizeOffloadedToolResultsForMemory(unpersisted);
		if (delta.length === 0) return;
		try {
			const telemetry = this.runtimeTelemetry.resolve(options);
			await this.saveMessagesWithSpan(
				memory,
				options.persistence.threadId,
				options.persistence.resourceId,
				delta,
				telemetry,
			);
			const last = unpersisted[unpersisted.length - 1];
			const lastCreatedAt = getCreatedAt(last);
			if (lastCreatedAt) {
				this.lastPersistedTurnKeyset = { createdAt: lastCreatedAt, id: last.id };
			}
		} catch (error) {
			// Best-effort: a completed turn's end-of-turn save still persists this delta,
			// so a transient failure here must not abort the suspend/cancel flow. Only a turn
			// that ends early (suspend-abandon or abort) whose save here also failed loses output.
			logger.warn('Failed to persist turn delta', {
				error,
				threadId: options.persistence.threadId,
			});
			this.eventBus.emit({
				type: AgentEvent.Error,
				message: 'Failed to persist turn delta',
				error,
				source: 'turn-delta-persistence',
			});
		}
	}

	/** Persist the current-turn delta to memory and schedule background indexing. */
	async saveToMemory(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		const memory = this.config.memory;
		if (!memory || !options?.persistence) return;
		const delta = sanitizeOffloadedToolResultsForMemory(list.turnDelta());
		if (delta.length === 0) return;
		const telemetry = this.runtimeTelemetry.resolve(options);
		await this.saveMessagesWithSpan(
			memory,
			options.persistence.threadId,
			options.persistence.resourceId,
			delta,
			telemetry,
		);

		// Memory jobs receive the execution counter so their LLM and embedding
		// usage contributes to token_count.

		const observationTasks = await this.scheduleObservationLogJobs(
			list,
			options.persistence,
			options.executionCounter,
			telemetry,
		);
		this.scheduleEpisodicMemoryJob(
			options.persistence,
			observationTasks,
			options.executionCounter,
			telemetry,
		);
	}

	/**
	 * Mid-run observation, called at clean loop boundaries. When the visible
	 * window's estimated model-facing token size crosses a soft threshold
	 * (`MID_RUN_SOFT_THRESHOLD_RATIO` x `observerThresholdTokens`), persist the
	 * turn-so-far (the Observer reads from the store) and start the Observer as
	 * a background task without blocking the loop. A later boundary activates
	 * the settled result cheaply: mask the observed messages out of the LLM
	 * window and refresh the injected observation log — no LLM call. Only when
	 * the budget reaches the hard threshold (`observerThresholdTokens`) does the
	 * loop block: it joins the in-flight task, or falls back to a synchronous
	 * Observer run. Best-effort: a skipped (lock held) or failed observer run —
	 * or any failure in the surrounding store reads and token counting — leaves
	 * the window untouched and never fails the run; the budget stays high and
	 * the next boundary retries. After `MID_RUN_MAX_NON_ADVANCING_ATTEMPTS`
	 * consecutive attempts that did not advance the cursor, mid-run observation
	 * latches off for the rest of the run instead of retrying every boundary.
	 */
	async maybeObserveMidRun(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		try {
			await this.observeMidRun(list, options);
		} catch (error) {
			// Masking only optimizes the next model call, so optional memory work
			// must never terminate the primary run.
			logger.warn('Mid-run observation failed', {
				error,
				threadId: options?.persistence?.threadId,
			});
		}
	}

	/** Reset per-run observation state on generate and resume entry. */
	private resetRunState(): void {
		this.midRunNonAdvancingAttempts = 0;
		this.lastPersistedTurnKeyset = undefined;
		this.visibleTokenEstimates.clear();
		this.visibleTokenEstimateTotal = 0;
	}

	/**
	 * Track whether an observer attempt advanced the cursor; after
	 * `MID_RUN_MAX_NON_ADVANCING_ATTEMPTS` consecutive misses, `observeMidRun`
	 * latches off for the rest of the run. Returns whether the cursor advanced.
	 */
	private noteMidRunObserverResult(
		result: ScopedMemoryTaskResult<RunObservationLogObserverResult>,
		threadId: string,
	): boolean {
		if (didAdvanceCursor(result)) {
			this.midRunNonAdvancingAttempts = 0;
			return true;
		}
		this.midRunNonAdvancingAttempts += 1;
		if (this.midRunNonAdvancingAttempts === MID_RUN_MAX_NON_ADVANCING_ATTEMPTS) {
			logger.warn('Mid-run observation latched off after repeated non-advancing observer runs', {
				threadId,
			});
		}
		return false;
	}

	private async observeMidRun(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		const { memory, observationalMemory } = this.config;
		if (!memory || !options?.persistence || !hasObservationLogObserverMemory(memory)) return;
		const observerThresholdTokens = observationalMemory?.observerThresholdTokens;
		if (!observationalMemory?.observe || observerThresholdTokens === undefined) return;

		// Phase 1: activate a settled background result first — cheap, resets
		// the budget for the threshold checks below. A failed or skipped task
		// just clears; the soft or hard path below retries.
		if (this.midRunObserverTask?.result) {
			const { result } = this.midRunObserverTask;
			this.midRunObserverTask = undefined;
			if (this.noteMidRunObserverResult(result, options.persistence.threadId)) {
				await this.activateObservations(list, options.persistence);
			}
		}

		if (this.midRunNonAdvancingAttempts >= MID_RUN_MAX_NON_ADVANCING_ATTEMPTS) return;

		const budget = await this.estimateVisibleBudget(list);
		const softThresholdTokens = Math.max(
			1,
			Math.floor(observerThresholdTokens * MID_RUN_SOFT_THRESHOLD_RATIO),
		);
		if (budget < softThresholdTokens) return;

		const telemetry = this.runtimeTelemetry.resolve(options);

		// Phase 2: hard threshold — the window must not grow past it. Join the
		// in-flight task if any; if still over (or none / failed), observe
		// synchronously.
		if (budget >= observerThresholdTokens) {
			logger.debug('Mid-run observation hit the hard threshold', {
				threadId: options.persistence.threadId,
				budget,
				observerThresholdTokens,
				observerInFlight: Boolean(this.midRunObserverTask),
			});
			if (this.midRunObserverTask) {
				const result = await this.midRunObserverTask.handle.done;
				this.midRunObserverTask = undefined;
				if (this.noteMidRunObserverResult(result, options.persistence.threadId)) {
					await this.activateObservations(list, options.persistence);
					if ((await this.estimateVisibleBudget(list)) < observerThresholdTokens) return;
				}
			}
			await this.persistTurnDelta(list, options);
			const handle = this.scheduleObserverTask(
				options.persistence,
				options.executionCounter,
				telemetry,
			);
			if (!handle) return;
			const result = await handle.done;
			if (!this.noteMidRunObserverResult(result, options.persistence.threadId)) return;
			await this.activateObservations(list, options.persistence);
			return;
		}

		// Phase 3: soft threshold — start the observer in the background; never
		// blocks the loop. One in-flight task at a time.
		if (this.midRunObserverTask) return;
		await this.persistTurnDelta(list, options);
		const handle = this.scheduleObserverTask(
			options.persistence,
			options.executionCounter,
			telemetry,
		);
		if (!handle) return;
		const entry: MidRunObserverTask = { handle };
		void handle.done.then((result) => {
			entry.result = result;
		});
		this.midRunObserverTask = entry;
	}

	/**
	 * Sum cached per-message estimates of the visible model-facing text and
	 * full tool payloads. Non-text blocks such as files are excluded.
	 */
	private async estimateVisibleBudget(list: AgentMessageList): Promise<number> {
		const visible = list.llmVisibleMessages();
		for (const message of visible) {
			if (!this.visibleTokenEstimates.has(message.id)) {
				const estimate = await this.tokenCounter(serializeMessageForBudget(message));
				this.visibleTokenEstimates.set(message.id, estimate);
				this.visibleTokenEstimateTotal += estimate;
			}
		}
		return this.visibleTokenEstimateTotal;
	}

	private pruneVisibleTokenEstimates(list: AgentMessageList): void {
		const visibleIds = new Set(list.llmVisibleMessages().map((message) => message.id));
		for (const [messageId, estimate] of this.visibleTokenEstimates) {
			if (!visibleIds.has(messageId)) {
				this.visibleTokenEstimates.delete(messageId);
				this.visibleTokenEstimateTotal -= estimate;
			}
		}
	}

	/** Mask the window up to the persisted cursor and refresh the injected log. No LLM call. */
	private async activateObservations(
		list: AgentMessageList,
		persistence: AgentPersistenceOptions,
	): Promise<void> {
		const memory = this.config.memory;
		if (!memory || !hasObservationLogObserverMemory(memory)) return;
		const cursor = await memory.getCursor(persistence.threadId);
		if (!cursor) return;
		list.maskObservedMessages(cursor);
		this.pruneVisibleTokenEstimates(list);
		await this.setListObservationLogMemory(list, persistence);
	}

	/**
	 * Re-derive the mid-run observation mask from the persisted cursor after a
	 * resume, so a run that compacted before suspending does not resume with
	 * the full pre-compaction window. Masks only when observations actually
	 * stand in for the pre-cursor messages (same desync guard as
	 * `loadHistoryMessages`).
	 */
	async applyObservationMask(
		list: AgentMessageList,
		persistence: AgentPersistenceOptions | undefined,
	): Promise<void> {
		// Resume entry point (a resume never runs `loadInto`): reset per-run
		// mid-run state so a cached runtime cannot carry the suspended run's
		// watermark or latch into the resumed run — the resolved tool call
		// mutated in place and must be re-persisted.
		this.resetRunState();
		const { memory, observationalMemory } = this.config;
		if (!observationalMemory) return;
		if (!memory || !persistence || !hasObservationLogObserverMemory(memory)) return;
		const cursor = await memory.getCursor(persistence.threadId);
		if (!cursor) return;
		if (!(await this.hasActiveObservations(memory, persistence.threadId))) return;
		list.maskObservedMessages(cursor);
	}

	/**
	 * Queue an Observer run on the scoped task runner, or return `undefined`
	 * when observation is not configured. Callers decide whether to await the
	 * handle (mid-run) or just track its `done` promise (post-turn).
	 */
	private scheduleObserverTask(
		persistence: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
		telemetry?: BuiltTelemetry,
	): ScopedMemoryTaskHandle<RunObservationLogObserverResult> | undefined {
		const { memory, observationalMemory } = this.config;
		if (!memory || !observationalMemory || !hasObservationLogObserverMemory(memory)) {
			return undefined;
		}
		const observe = observationalMemory.observe;
		const observerThresholdTokens = observationalMemory.observerThresholdTokens;
		if (!observe || observerThresholdTokens === undefined) return undefined;

		const scope = this.getObservationLogScope(persistence);
		const runner = this.getMemoryTaskRunner(memory, observationalMemory.lockTtlMs);
		return runner.schedule(
			{ ...scope, taskKind: 'observer' },
			async () =>
				await runObservationLogObserver({
					memory,
					...scope,
					observationLogTailLimit: observationalMemory.observationLogTailLimit ?? 0,
					observe,
					tokenCounter: this.tokenCounter,
					executionCounter,
					telemetry,
				}),
		);
	}

	private async scheduleObservationLogJobs(
		list: AgentMessageList,
		persistence: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
		telemetry?: BuiltTelemetry,
	): Promise<Array<Promise<unknown>>> {
		const { memory, observationalMemory } = this.config;
		if (!memory || !observationalMemory || !hasObservationLogStore(memory)) return [];

		const scope = this.getObservationLogScope(persistence);
		const runner = this.getMemoryTaskRunner(memory, observationalMemory.lockTtlMs);
		const tasks: Array<Promise<unknown>> = [];

		// A mid-run task still in flight for this scope already covers the
		// messages persisted at its boundary: join it instead of queueing a
		// second observer behind it — the post-boundary tail waits for the next
		// turn's gate. A task that settled after the last boundary was never
		// activated; the run is over, so drop it and let the gauge decide.
		const midRunTask = this.midRunObserverTask;
		if (midRunTask?.result) this.midRunObserverTask = undefined;
		if (
			midRunTask &&
			!midRunTask.result &&
			midRunTask.handle.observationScopeId === scope.observationScopeId
		) {
			tasks.push(midRunTask.handle.done);
			void midRunTask.handle.done.then(() => {
				if (this.midRunObserverTask === midRunTask) this.midRunObserverTask = undefined;
			});
		} else if (await this.shouldScheduleObserver(list, persistence.threadId)) {
			const observerHandle = this.scheduleObserverTask(persistence, executionCounter, telemetry);
			if (observerHandle) tasks.push(observerHandle.done);
		}

		const reflect = observationalMemory.reflect;
		const reflectorThresholdTokens = observationalMemory.reflectorThresholdTokens;
		if (reflect && reflectorThresholdTokens !== undefined) {
			tasks.push(
				this.scheduleMemoryTask(
					runner,
					scope,
					'reflector',
					async () =>
						await runObservationLogReflector({
							memory,
							...scope,
							reflectorThresholdTokens,
							reflect,
							tokenCounter: this.tokenCounter,
							executionCounter,
							telemetry,
						}),
				),
			);
		}

		return tasks;
	}

	private async shouldScheduleObserver(list: AgentMessageList, threadId: string): Promise<boolean> {
		const observerThresholdTokens = this.config.observationalMemory?.observerThresholdTokens;
		if (observerThresholdTokens === undefined) return false;
		try {
			return (await this.estimateVisibleBudget(list)) >= observerThresholdTokens;
		} catch (error) {
			logger.warn('Post-turn observer gating failed; skipping observation this turn', {
				error,
				threadId,
			});
			return false;
		}
	}

	private scheduleEpisodicMemoryJob(
		persistence: AgentPersistenceOptions,
		observationTasks: Array<Promise<unknown>>,
		executionCounter?: AgentExecutionCounter,
		telemetry?: BuiltTelemetry,
	): void {
		const { memory, episodicMemory } = this.config;
		if (
			!memory ||
			!episodicMemory ||
			!isEpisodicMemoryEnabled(episodicMemory) ||
			!hasEpisodicMemoryStore(memory) ||
			!hasObservationLogStore(memory) ||
			!episodicMemory.extract
		) {
			return;
		}
		const scope = getEpisodicMemoryScope(persistence);
		if (!scope) return;

		const observationScope = this.getObservationLogScope(persistence);
		this.scheduleEpisodicMemoryTask(memory, scope.resourceId, async () => {
			await Promise.allSettled(observationTasks);
			await runEpisodicMemoryIndexer({
				memory,
				config: episodicMemory,
				scope,
				observationScope,
				threadId: persistence.threadId,
				executionCounter,
				telemetry,
				agentName: this.config.name,
			});
		});
	}

	private scheduleEpisodicMemoryTask(
		memory: BuiltMemory,
		resourceId: string,
		task: () => Promise<void>,
	): void {
		const id = crypto.randomUUID();
		const previous = this.episodicMemoryTasksByResource.get(resourceId) ?? Promise.resolve();
		const done = previous
			.catch(() => undefined)
			.then(async () => await this.runEpisodicMemoryTask(memory, resourceId, id, task));
		const queued = done.finally(() => {
			if (this.episodicMemoryTasksByResource.get(resourceId) === queued) {
				this.episodicMemoryTasksByResource.delete(resourceId);
			}
		});
		this.episodicMemoryTasksByResource.set(resourceId, queued);
		this.backgroundTasks.track(queued);
	}

	private async runEpisodicMemoryTask(
		memory: BuiltMemory,
		resourceId: string,
		holderId: string,
		task: () => Promise<void>,
	): Promise<void> {
		const taskLock = memory.episodic?.taskLock;
		let lock: EpisodicMemoryTaskLockHandle | null = null;
		try {
			if (taskLock) {
				lock = await taskLock.acquire(resourceId, {
					holderId,
					ttlMs: this.config.observationalMemory?.lockTtlMs ?? DEFAULT_MEMORY_TASK_LOCK_TTL_MS,
				});
				if (!lock) return;
			}
			await task();
		} catch (error) {
			const message = 'Episodic memory indexing task failed';
			logger.warn(message, { error, resourceId });
			this.eventBus.emit({ type: AgentEvent.Error, message, error, source: 'episodic-memory' });
		} finally {
			if (lock) {
				await this.releaseEpisodicMemoryTaskLock(taskLock, lock, resourceId);
			}
		}
	}

	private async releaseEpisodicMemoryTaskLock(
		taskLock: EpisodicMemoryTaskLockMethods | undefined,
		lock: EpisodicMemoryTaskLockHandle,
		resourceId: string,
	): Promise<void> {
		try {
			await taskLock?.release(lock);
		} catch (error) {
			logger.warn('Episodic memory indexing lock release failed', { error, resourceId });
		}
	}

	private async scheduleMemoryTask<T>(
		runner: ScopedMemoryTaskRunner,
		scope: ObservationLogScope,
		taskKind: ObservationLogTaskKind,
		task: () => Promise<T>,
	): Promise<unknown> {
		return await runner.schedule({ ...scope, taskKind }, task).done;
	}

	private getMemoryTaskRunner(memory: BuiltMemory, lockTtlMs?: number): ScopedMemoryTaskRunner {
		this.memoryTasks ??= new ScopedMemoryTaskRunner({
			tracker: this.backgroundTasks,
			lockStore: hasObservationLogTaskLockStore(memory) ? memory : undefined,
			lockTtlMs,
			onEvent: (event) => {
				this.config.onMemoryTaskEvent?.(event);

				if (event.type !== 'failed') return;

				const source = event.task.taskKind;
				const message = `Observation log ${source} task failed`;

				logger.warn(message, {
					error: event.error,
					observationScopeId: event.task.observationScopeId,
				});

				this.eventBus.emit({ type: AgentEvent.Error, message, error: event.error, source });
			},
		});
		return this.memoryTasks;
	}

	private getObservationLogScope(persistence: AgentPersistenceOptions): ObservationLogScope {
		return {
			observationScopeId: persistence.threadId,
		};
	}
}
