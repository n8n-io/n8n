import {
	FLAG_MEMORY_TOOL_NAME,
	resolveEpisodicMemoryCapture,
	runEpisodicMemoryCandidateProcessor,
} from './episodic-memory-capture';
import { createFilteredLogger } from '../logger';
import { compareKeyset, saveMessagesToThread } from './memory-store';
import {
	readObservationState,
	runObservationLogObserver,
	type RunObservationLogObserverResult,
} from './observation-log-observer';
import { runObservationLogReflector } from './observation-log-reflector';
import { renderObservationLog } from './observation-log-renderer';
import {
	hasObservationLogObserverMemory,
	hasObservationLogStore,
	hasObservationLogTaskLockStore,
} from './observation-log-store';
import {
	ScopedMemoryTaskRunner,
	type ScopedMemoryTaskHandle,
	type ScopedMemoryTaskResult,
} from './scoped-memory-task-runner';
import { settleOrphanedToolMessagesWithChanges } from './strip-orphaned-tool-messages';
import { messageToText } from './message-text';
import {
	DEFAULT_MEMORY_POLICY,
	MemoryBudget,
	decideResume,
	shouldStopObserving,
} from './observation-policy';
import { isAfterPoint, ResumeStateStore, resumeView, type ObservationPoint } from './resume-state';
import { getModelContextWindow } from '../../sdk/catalog';
import { getCreatedAt } from '../../sdk/message';
import { getCatalogModelId, getModelIdString } from '../../utils/model';
import type {
	AgentExecutionCounter,
	BuiltMemory,
	BuiltTelemetry,
	EpisodicMemoryScope,
	EpisodicMemoryTaskLockHandle,
	EpisodicMemoryTaskLockMethods,
} from '../../types';
import { AgentEvent } from '../../types/runtime/event';
import type {
	AgentPersistenceOptions,
	ExecutionOptions,
	RunOptions,
	SideCallTask,
	SideCallUsageReport,
	TokenUsage,
} from '../../types/sdk/agent';
import type { AgentDbMessage } from '../../types/sdk/message';
import type { ObservationLogScope, ObservationLogTaskKind } from '../../types/sdk/observation-log';
import type { ObservationResumeState } from '../../types/sdk/observation';
import type { AgentRuntimeConfig } from '../../types/runtime/agent-runtime';
import { promptSizeOf } from '../loop/prompt-size-usage';
import { computeSideCallCost } from '../loop/side-call-cost';
import type { AgentMessageList } from '../model/message-list';
import { getPromptCacheRetentionMs } from '../model/prompt-cache';
import { estimateObservationTokens, type TokenCounter } from '../model/model-token-counter';
import type { BackgroundTaskTracker } from '../state/background-task-tracker';
import type { AgentEventBus } from '../state/event-bus';
import {
	inferMemoryStoreAttributes,
	withMemorySpan,
	type MemorySpanAttributes,
	type RuntimeTelemetry,
} from '../telemetry/runtime-telemetry';
import { RequestSizeTracker } from './request-size-tracker';
import { sanitizeOffloadedToolResultsForMemory } from './tool-result-memory';

const DEFAULT_MEMORY_TASK_LOCK_TTL_MS = 30_000;
const logger = createFilteredLogger();

/** Host callback that receives a priced side-call usage report to add to the session total. */
type OnSideCallUsage = (report: SideCallUsageReport) => void | Promise<void>;

function latestActivityAt(messages: AgentDbMessage[]): number | undefined {
	let latest: number | undefined;
	for (const message of messages) {
		const time = getCreatedAt(message)?.getTime();
		if (time !== undefined && Number.isFinite(time) && (latest === undefined || time > latest)) {
			latest = time;
		}
	}
	return latest;
}

/** Renders the current observation log instead of saved notes. */
const LIVE_NOTES: unique symbol = Symbol('liveNotes');

/**
 * Notes for the list. `LIVE_NOTES` renders the current observation log. A
 * string or `undefined` is sent as is.
 */
type ListNotes = string | undefined | typeof LIVE_NOTES;

/** History and notes for a new run. */
interface RunHistory {
	messages: AgentDbMessage[];
	notes: ListNotes;
}

/** Observer state of one run. Queued jobs keep their run's state when a new run starts. */
interface ObserverRunState {
	consecutiveFailures: number;
	stopped: boolean;
}

function hasSuccessfulMemoryFlag(list: AgentMessageList): boolean {
	return list
		.turnDelta()
		.some(
			(message) =>
				'content' in message &&
				message.content.some(
					(part) =>
						part.type === 'tool-call' &&
						part.toolName === FLAG_MEMORY_TOOL_NAME &&
						part.state === 'resolved',
				),
		);
}

/**
 * The saved resume state, or `undefined` when it no longer matches the log.
 * A resume point needs a cursor at or past it: the notes must cover every
 * message the view drops. A reset or missing log makes the point stale, and
 * the thread is sent in full again.
 */
function validResumeState(
	state: ObservationResumeState | null | undefined,
	cursor: ObservationPoint | null | undefined,
): ObservationResumeState | undefined {
	if (!state) return undefined;
	const from = state.resumeFrom;
	if (!from) return state;
	if (!cursor) return undefined;
	const resumeIsAhead =
		compareKeyset(
			{ createdAt: new Date(from.lastObservedAt), id: from.lastObservedMessageId },
			{ createdAt: new Date(cursor.lastObservedAt), id: cursor.lastObservedMessageId },
		) > 0;
	return resumeIsAhead ? undefined : state;
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

function didAdvanceObserver(
	result: RunObservationLogObserverResult,
): result is Extract<RunObservationLogObserverResult, { status: 'ran' }> {
	return result.status === 'ran' && result.cursorAdvanced;
}

/**
 * The persisted messages that the runtime replays to the model on the next
 * turn (see `resumeView`). A host that checks what the model already sees
 * must read the same window.
 */
export async function loadReplayedMessages(
	memory: BuiltMemory,
	persistence: Pick<AgentPersistenceOptions, 'threadId' | 'resourceId'>,
	options: { observationalMemory: boolean },
): Promise<AgentDbMessage[]> {
	const { threadId, resourceId } = persistence;
	if (!options.observationalMemory || !hasObservationLogObserverMemory(memory)) {
		return await memory.getMessages(threadId, { resourceId });
	}
	const [saved, cursor] = await Promise.all([
		memory.getResumeState(threadId),
		memory.getCursor(threadId),
	]);
	const from = validResumeState(saved, cursor)?.resumeFrom;
	if (!from) return await memory.getMessages(threadId, { resourceId });
	// The scope query does not filter by resource, so shared threads read through getMessages.
	if (resourceId) {
		const messages = await memory.getMessages(threadId, { resourceId });
		return messages.filter((m) => isAfterPoint(m, from));
	}
	// Read only the messages after the resume point, so long threads stay cheap to check.
	return await memory.getMessagesForObservationScope(threadId, {
		since: {
			sinceCreatedAt: new Date(from.lastObservedAt),
			sinceMessageId: from.lastObservedMessageId,
		},
	});
}

/**
 * Owns all memory-store side effects for a single agent runtime: loading thread
 * history, seeding the live message list with the active observation log,
 * persisting the turn delta, and scheduling background observation-log and
 * episodic-memory processing jobs.
 *
 */
export class MemoryOrchestrator {
	private memoryTasks: ScopedMemoryTaskRunner | undefined;

	/** Keyed by resource and thread because backends can lock on either scope. */
	private episodicMemoryTasks = new Map<string, Promise<unknown>>();

	/** Size of the next model request, from the provider's reported usage. */
	private readonly requestSize: RequestSizeTracker;

	/** In-flight background mid-run observer task; `result` set on settlement. */
	private midRunObserverTask: MidRunObserverTask | undefined;

	/**
	 * Set when a mid-run observer advanced the cursor this run. The post-turn
	 * gate reads the masked window, so the tail must be observed unconditionally.
	 */
	private cursorAdvancedThisRun = false;

	private observerRun: ObserverRunState = { consecutiveFailures: 0, stopped: false };

	/**
	 * Keyset high-water mark of turn messages already persisted mid-run;
	 * `persistTurnDelta` saves only the suffix after it.
	 */
	private lastPersistedTurnKeyset: { createdAt: Date; id: string } | undefined;

	/** Cursor known at load or last activation; used to count unobserved tokens. */
	private knownCursor: ObservationPoint | undefined;

	/** Resume state of the thread of this run. */
	private resume: ResumeStateStore | undefined;

	/** Limits for this runtime; the model's window is looked up once. */
	private budget: Promise<MemoryBudget | undefined> | undefined;

	constructor(
		private readonly config: AgentRuntimeConfig,
		private readonly backgroundTasks: BackgroundTaskTracker,
		private readonly eventBus: AgentEventBus,
		private readonly runtimeTelemetry: RuntimeTelemetry,
		private readonly tokenCounter: TokenCounter = estimateObservationTokens,
	) {
		this.requestSize = new RequestSizeTracker(tokenCounter);
	}

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
				const messages = await loadReplayedMessages(
					memory,
					{ threadId, resourceId },
					{ observationalMemory: Boolean(this.config.observationalMemory) },
				);
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
			this.scheduleEpisodicMemoryJob(
				options.persistence,
				options.executionCounter,
				telemetry,
				options.onSideCallUsage,
			);
			const { messages: memMessages, notes } = await this.loadHistoryForRun(
				{ ...options, persistence: options.persistence },
				telemetry,
			);

			if (memMessages.length > 0) {
				// Settle (not strip) so an abandoned suspension stays visible as an
				// explicit "never completed" record instead of vanishing (INS-1223).
				const { settled, changed } = settleOrphanedToolMessagesWithChanges(memMessages);
				list.addHistory(settled);
				if (options.persistence.persistSettledSuspensions && changed.length > 0) {
					await this.persistSettledHistory(changed, options.persistence, telemetry);
				}
			}
			await this.setListObservationLogMemory(list, options.persistence, { notes });
			return;
		}

		await this.setListObservationLogMemory(list, options?.persistence);
	}

	/**
	 * History for a new run. One rule decides what the model sees: the saved
	 * notes plus the messages after the resume point, or the full thread when
	 * there is no resume point. The resume point moves up to the cursor only
	 * when `decideResume` says so; an over-limit thread first observes its
	 * backlog, so the notes cover everything they replace.
	 */
	private async loadHistoryForRun(
		options: RunOptions & ExecutionOptions & { persistence: AgentPersistenceOptions },
		telemetry: BuiltTelemetry | undefined,
	): Promise<RunHistory> {
		const { memory, observationalMemory } = this.config;
		const { persistence } = options;
		if (!memory || !observationalMemory || !hasObservationLogObserverMemory(memory)) {
			return {
				messages: await this.loadHistoryMessages(persistence, telemetry),
				notes: LIVE_NOTES,
			};
		}
		const { threadId, resourceId } = persistence;
		const resume = new ResumeStateStore(memory, threadId);
		this.resume = resume;
		const [{ cursor }, saved, all] = await Promise.all([
			readObservationState(memory, threadId),
			resume.load(),
			memory.getMessages(threadId, { resourceId }),
		]);
		this.knownCursor = cursor ?? undefined;
		const state = validResumeState(saved, cursor);
		if (saved && !state) {
			logger.debug('Ignoring stale observation resume point', { threadId });
			resume.forget();
		}
		const view = resumeView(all, state);
		const budget = cursor ? await this.resolveBudget() : undefined;
		if (!cursor || !budget) return view;

		const viewTokens = await this.sumTokens(view.messages);
		const modelId = this.modelId();
		const reason = decideResume({
			// The saved size is the provider's count for the same view, so it
			// includes the system prompt and tools that the estimate misses.
			requestTokens: state?.lastRequestTokens ?? viewTokens,
			budget,
			replaceableTokens: await this.sumTokens(
				view.messages.filter((m) => !isAfterPoint(m, cursor)),
			),
			now: Date.now(),
			lastActivityAt: latestActivityAt(all),
			cacheTtlMs: this.cacheTtlMs(),
			modelSwitched: Boolean(state?.lastModelId && modelId) && state?.lastModelId !== modelId,
		});
		if (!reason) {
			if (state?.lastRequestTokens) this.requestSize.seed(state.lastRequestTokens, viewTokens);
			return view;
		}

		let resumeAt: ObservationPoint = cursor;
		if (reason === 'over-limit')
			resumeAt = (await this.observeBacklog(options, telemetry)) ?? cursor;
		const notes = await this.renderLiveNotes(persistence);
		// Without notes, a resume would drop earlier messages with nothing in their
		// place. Only an over-limit thread must shrink at that cost.
		if (!notes && reason !== 'over-limit') return view;
		await resume.moveTo(resumeAt, notes, modelId);
		logger.debug('Observation resume point moved at turn start', { threadId, reason });
		return resumeView(all, resume.current);
	}

	/** Run the Observer over the whole backlog and return the new cursor. */
	private async observeBacklog(
		options: RunOptions & ExecutionOptions & { persistence: AgentPersistenceOptions },
		telemetry: BuiltTelemetry | undefined,
	): Promise<ObservationPoint | undefined> {
		const memory = this.config.memory;
		if (!memory || !hasObservationLogObserverMemory(memory)) return undefined;
		const handle = this.scheduleObserverTask(
			options.persistence,
			options.executionCounter,
			telemetry,
			options.onSideCallUsage,
			{ unlimited: true },
		);
		if (!handle) return undefined;
		const result = await handle.done;
		if (!didAdvanceCursor(result)) return undefined;
		const { cursor } = await readObservationState(memory, options.persistence.threadId);
		this.knownCursor = cursor ?? undefined;
		return cursor ?? undefined;
	}

	private async sumTokens(messages: AgentDbMessage[]): Promise<number> {
		let total = 0;
		for (const message of messages) total += await this.tokenCounter(messageToText(message));
		return total;
	}

	private cacheTtlMs(): number {
		const configured = this.config.observationalMemory?.cacheTtlMs;
		if (configured !== undefined) return configured;
		const modelId = this.modelId();
		const retention = modelId
			? getPromptCacheRetentionMs(this.config.promptCaching, modelId)
			: undefined;
		return retention ?? DEFAULT_MEMORY_POLICY.cacheTtlMs;
	}

	private modelId(): string | null {
		// Custom model objects can carry no id; treat that as unknown.
		const id = this.config.model ? getModelIdString(this.config.model) : undefined;
		return typeof id === 'string' && id.length > 0 ? id : null;
	}

	/** Save the request size of this turn, so the next turn starts from a real count. */
	private async saveRequestSize(list: AgentMessageList): Promise<void> {
		if (!this.resume) return;
		let tokens: number;
		try {
			tokens = await this.requestSize.estimate(list);
		} catch (error) {
			// A missing size only means the next turn estimates again.
			logger.warn('Failed to estimate request size', { error });
			return;
		}
		await this.resume.saveRequestSize(tokens, this.modelId());
	}

	/** Limits for this runtime. The model's window is looked up once. */
	private async resolveBudget(): Promise<MemoryBudget | undefined> {
		const observationalMemory = this.config.observationalMemory;
		if (!observationalMemory) return undefined;
		this.budget ??= this.lookUpModelWindow(observationalMemory).then((window) =>
			MemoryBudget.resolve(observationalMemory, window),
		);
		return await this.budget;
	}

	private async lookUpModelWindow(
		observationalMemory: NonNullable<AgentRuntimeConfig['observationalMemory']>,
	): Promise<number | undefined> {
		// Fixed thresholds need the window too, so the hard limit stays under it.
		const shares = observationalMemory.windowShares;
		if (shares?.contextWindowTokens) return shares.contextWindowTokens;
		try {
			const modelId = getCatalogModelId(this.config.model);
			const window = await getModelContextWindow(modelId, this.config.modelFetch);
			logger.debug('Resolved observation context window', { modelId, window });
			return window ?? undefined;
		} catch (error) {
			logger.warn('Context window lookup failed; using the memory cap', { error });
			return undefined;
		}
	}

	private async saveMessagesWithSpan(
		memory: BuiltMemory,
		threadId: string,
		resourceId: string,
		messages: AgentDbMessage[],
		telemetry: BuiltTelemetry | undefined,
		hostMetadata: AgentPersistenceOptions['hostMetadata'],
	): Promise<void> {
		await withMemorySpan(
			'save_memory',
			this.config.name,
			telemetry,
			() => ({ types: ['session'], owners: [resourceId], ...inferMemoryStoreAttributes(memory) }),
			async () => {
				await saveMessagesToThread(memory, threadId, resourceId, messages, hostMetadata);
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

	/** Current observation log, rendered for the prompt. */
	private async renderLiveNotes(options: AgentPersistenceOptions): Promise<string | undefined> {
		const memory = this.config.memory;
		if (!memory || !hasObservationLogStore(memory)) return undefined;
		const observations = await memory.getActiveObservationLog({
			...this.getObservationLogScope(options),
			order: 'asc',
		});
		return this.renderNotes(observations);
	}

	private renderNotes(observations: Parameters<typeof renderObservationLog>[0]) {
		const { renderTokenBudget } = this.config.observationLog ?? {};
		return renderObservationLog(observations, { renderTokenBudget }) ?? undefined;
	}

	/** The one place notes enter the list, so placement is set the same way on every path. */
	private setListNotes(
		list: AgentMessageList,
		observationalMemory: AgentRuntimeConfig['observationalMemory'],
		notes: string | undefined,
	): void {
		list.observationLogPlacement =
			observationalMemory?.logPlacement ?? DEFAULT_MEMORY_POLICY.logPlacement;
		list.observationLogMemory = notes;
	}

	/**
	 * Put notes into the list. `notes: LIVE_NOTES` (the default) renders the
	 * current log; a string or `undefined` is used as is. Returns the notes set.
	 */
	async setListObservationLogMemory(
		list: AgentMessageList,
		options: AgentPersistenceOptions | undefined,
		opts: { notes?: ListNotes } = {},
	): Promise<string | undefined> {
		// An explicit `notes: undefined` means no notes, not the default.
		const notes = 'notes' in opts ? opts.notes : LIVE_NOTES;
		const memory = this.config.memory;
		if (!memory || !options?.threadId || !hasObservationLogStore(memory)) return undefined;
		const observations = await memory.getActiveObservationLog({
			...this.getObservationLogScope(options),
			order: 'asc',
		});
		const rendered = notes === LIVE_NOTES ? this.renderNotes(observations) : notes;
		this.setListNotes(list, this.config.observationalMemory, rendered);
		// Empty batches can move the cursor beyond the latest observation.
		// Seed both timestamps to keep new messages after the trusted cursor.
		if (observations.length > 0) {
			list.seedLastCreatedAt(observations[observations.length - 1].createdAt.getTime());
			const cursor = hasObservationLogObserverMemory(memory)
				? await memory.getCursor(options.threadId)
				: null;
			if (cursor) list.seedLastCreatedAt(new Date(cursor.lastObservedAt).getTime());
		}
		return rendered;
	}

	async discardRejectedInput(
		list: AgentMessageList,
		messageIds: string[],
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		list.removeInput(messageIds);
		if (!this.config.memory || !options?.persistence || messageIds.length === 0) return;
		try {
			await this.config.memory.deleteMessages(messageIds);
		} catch (error) {
			logger.warn('Failed to remove rejected input', {
				error,
				threadId: options.persistence.threadId,
			});
		}
	}

	/**
	 * Write back history messages whose abandoned tool calls were settled at load. A
	 * stored pending call stops the Observer, so compaction would stop for the thread.
	 * Best-effort: the next fresh run settles and writes the same messages again.
	 */
	private async persistSettledHistory(
		messages: AgentDbMessage[],
		persistence: AgentPersistenceOptions,
		telemetry: BuiltTelemetry | undefined,
	): Promise<void> {
		const memory = this.config.memory;
		if (!memory) return;
		try {
			// No host metadata: these messages belong to an earlier run, not to this one.
			await this.saveMessagesWithSpan(
				memory,
				persistence.threadId,
				persistence.resourceId,
				messages,
				telemetry,
				undefined,
			);
		} catch (error) {
			logger.warn('Failed to persist settled tool calls from history', {
				error,
				threadId: persistence.threadId,
			});
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
				options.persistence.hostMetadata,
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
		const observerRun = this.observerRun;
		try {
			const telemetry = this.runtimeTelemetry.resolve(options);
			await this.saveMessagesWithSpan(
				memory,
				options.persistence.threadId,
				options.persistence.resourceId,
				delta,
				telemetry,
				options.persistence.hostMetadata,
			);
			const last = unpersisted[unpersisted.length - 1];
			const lastCreatedAt = getCreatedAt(last);
			if (lastCreatedAt) {
				this.lastPersistedTurnKeyset = { createdAt: lastCreatedAt, id: last.id };
			}
		} catch (error) {
			// The Observer reads from the store, so it must not see a partial turn.
			observerRun.stopped = true;
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
			options.persistence.hostMetadata,
		);

		// Memory jobs receive the execution counter so their LLM and embedding
		// usage contributes to token_count.

		await this.scheduleObservationLogJobs(
			list,
			options.persistence,
			options.executionCounter,
			telemetry,
			options.onSideCallUsage,
		);
		await this.saveRequestSize(list);
		if (hasSuccessfulMemoryFlag(list)) {
			this.scheduleEpisodicMemoryJob(
				options.persistence,
				options.executionCounter,
				telemetry,
				options.onSideCallUsage,
			);
		}
	}

	/**
	 * Mid-run observation, called at clean loop boundaries. The size compared
	 * against the thresholds is the next request's: the input tokens the last
	 * model call reported plus the estimate of messages added since (see
	 * `RequestSizeTracker`). When it crosses the soft threshold, persist the
	 * turn-so-far (the Observer reads from the store) and start the Observer as
	 * a background task without blocking the loop. A later boundary activates
	 * the settled result cheaply: mask the observed messages out of the LLM
	 * window and refresh the injected observation log — no LLM call. Only when
	 * the budget reaches the hard limit (the hard threshold, capped at the
	 * context window) does the loop block: it joins the in-flight task, or
	 * falls back to a synchronous Observer run. Best-effort: a skipped (lock held) or failed observer run —
	 * or any failure in the surrounding store reads and token counting — leaves
	 * the window untouched and never fails the run. A failed attempt or a response
	 * that does not advance the cursor disables observation until the next run.
	 * Lock contention and incomplete tool calls can be checked at the next boundary.
	 */
	async maybeObserveMidRun(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		const run = this.observerRun;
		try {
			await this.observeMidRun(list, options);
		} catch (error) {
			this.noteObserverFailure(run);
			// Masking only optimizes the next model call, so optional memory work
			// must never terminate the primary run.
			logger.warn('Mid-run observation failed', {
				error,
				threadId: options?.persistence?.threadId,
			});
		}
	}

	/**
	 * Record the input size the provider reported for a model call. Call it
	 * before the response joins the list, so the visible estimate matches what
	 * the call sent.
	 */
	async recordModelCallUsage(list: AgentMessageList, usage: TokenUsage | undefined): Promise<void> {
		if (!usage || !this.config.observationalMemory?.observe) return;
		try {
			await this.requestSize.record(list, promptSizeOf(usage));
		} catch (error) {
			// A missing measurement only means later checks estimate instead.
			logger.warn('Failed to record model call usage', { error });
		}
	}

	/** Reset per-run observation state on generate and resume entry. */
	private resetRunState(): void {
		this.midRunObserverTask = undefined;
		this.observerRun = { consecutiveFailures: 0, stopped: false };
		this.lastPersistedTurnKeyset = undefined;
		this.requestSize.reset();
		this.cursorAdvancedThisRun = false;
		this.knownCursor = undefined;
		this.resume = undefined;
	}

	/**
	 * One rule for every Observer failure path: count it, and stop observing
	 * for the run when the failure policy says so. Queued jobs keep their
	 * run's state, so pass the state captured when the job started.
	 */
	private noteObserverFailure(run: ObserverRunState): void {
		run.consecutiveFailures++;
		const config = this.config.observationalMemory;
		if (!config || shouldStopObserving(config, run.consecutiveFailures)) run.stopped = true;
	}

	private noteMidRunObserverResult(
		result: ScopedMemoryTaskResult<RunObservationLogObserverResult>,
	): boolean {
		if (didAdvanceCursor(result)) {
			this.cursorAdvancedThisRun = true;
			return true;
		}
		return false;
	}

	private async observeMidRun(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		const { memory, observationalMemory } = this.config;
		if (!memory || !options?.persistence || !hasObservationLogObserverMemory(memory)) return;
		// Hosts can restrict the Observer to the post-turn path, so the visible
		// window stays byte-stable within a turn (better prompt-cache reuse).
		if (observationalMemory?.midRunObservation === false) return;
		if (!observationalMemory?.observe) return;
		const memoryBudget = await this.resolveBudget();
		if (!memoryBudget) return;
		const { hardLimit, thresholds } = memoryBudget;

		// Phase 1: activate a settled background result first — cheap, resets
		// the budget for the threshold checks below.
		if (this.midRunObserverTask?.result) {
			const { result } = this.midRunObserverTask;
			this.midRunObserverTask = undefined;
			if (this.noteMidRunObserverResult(result)) {
				await this.activateObservations(list, options.persistence);
			}
		}

		if (this.observerRun.stopped) return;

		const budget = await this.requestSize.estimate(list);
		if (budget < thresholds.midRunSoft) return;

		const telemetry = this.runtimeTelemetry.resolve(options);

		// Phase 2: hard threshold — the window must not grow past it. Join the
		// in-flight task if any. Observe again only if the run is still enabled.
		if (budget >= hardLimit) {
			logger.debug('Mid-run observation hit the hard limit', {
				threadId: options.persistence.threadId,
				budget,
				hardLimit,
				observerInFlight: Boolean(this.midRunObserverTask),
			});
			if (this.midRunObserverTask) {
				const result = await this.midRunObserverTask.handle.done;
				this.midRunObserverTask = undefined;
				if (this.noteMidRunObserverResult(result)) {
					await this.activateObservations(list, options.persistence);
					if ((await this.requestSize.estimate(list)) < hardLimit) return;
				}
			}
			if (this.observerRun.stopped) return;
			await this.persistTurnDelta(list, options);
			const handle = this.scheduleObserverTask(
				options.persistence,
				options.executionCounter,
				telemetry,
				options.onSideCallUsage,
				{ unlimited: true },
			);
			if (!handle) return;
			const result = await handle.done;
			if (!this.noteMidRunObserverResult(result)) return;
			await this.activateObservations(list, options.persistence);
			await this.warnIfOverWindow(list, memoryBudget, options.persistence.threadId);
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
			options.onSideCallUsage,
			{ unlimited: true },
		);
		if (!handle) return;
		const entry: MidRunObserverTask = { handle };
		void handle.done.then((result) => {
			entry.result = result;
		});
		this.midRunObserverTask = entry;
	}

	/**
	 * Observation cannot shrink the request further, so the provider is likely
	 * to reject it. Log it to explain the failure that follows.
	 */
	private async warnIfOverWindow(
		list: AgentMessageList,
		budget: MemoryBudget,
		threadId: string,
	): Promise<void> {
		const requestTokens = await this.requestSize.estimate(list);
		if (!budget.isOverModelWindow(requestTokens)) return;
		logger.warn('Request is still over the context window after observation', {
			threadId,
			requestTokens,
			contextWindow: budget.modelWindow,
		});
	}

	/**
	 * Swap the observed messages for notes mid-turn: mask up to the persisted
	 * cursor, load the current notes, and save that point as the resume point,
	 * so later turns start from the same notes. No LLM call.
	 */
	private async activateObservations(
		list: AgentMessageList,
		persistence: AgentPersistenceOptions,
	): Promise<void> {
		const memory = this.config.memory;
		if (!memory || !hasObservationLogObserverMemory(memory)) return;
		const { cursor } = await readObservationState(memory, persistence.threadId);
		if (!cursor) return;
		this.knownCursor = cursor;
		list.maskObservedMessages(cursor);
		this.requestSize.invalidate();
		const notes = await this.setListObservationLogMemory(list, persistence);
		await this.resume?.moveTo(cursor, notes, this.modelId());
	}

	/**
	 * Re-derive the mask after a suspended run resumes, so a run that swapped
	 * to notes before suspending does not resume with the full window. Uses the
	 * same rule as history loading: the saved resume point and its notes.
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
		const resume = new ResumeStateStore(memory, persistence.threadId);
		this.resume = resume;
		const [{ cursor }, saved] = await Promise.all([
			readObservationState(memory, persistence.threadId),
			resume.load(),
		]);
		this.knownCursor = cursor ?? undefined;
		const state = validResumeState(saved, cursor);
		if (saved && !state) resume.forget();
		// Without a resume point the window holds the full thread, so notes
		// would duplicate it. An oversized window is swapped at the next step
		// by the hard-limit check.
		if (state?.resumeFrom) list.maskObservedMessages(state.resumeFrom);
		this.setListNotes(list, observationalMemory, resumeView([], state).notes);
	}

	/**
	 * Queue an Observer task on the scoped task runner, or return `undefined`
	 * when observation is not configured. The task reads the backlog in batches
	 * that fit the memory model, up to `maxObserverBatchesAfterTurn` calls after a
	 * turn. `unlimited` lifts that cap for callers that must shrink the request.
	 */
	private scheduleObserverTask(
		persistence: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
		telemetry?: BuiltTelemetry,
		onSideCallUsage?: OnSideCallUsage,
		{ unlimited = false }: { unlimited?: boolean } = {},
	): ScopedMemoryTaskHandle<RunObservationLogObserverResult> | undefined {
		const run = this.observerRun;
		if (run.stopped) return undefined;
		const { memory, observationalMemory } = this.config;
		if (!memory || !observationalMemory || !hasObservationLogObserverMemory(memory)) {
			return undefined;
		}
		const observe = observationalMemory.observe;
		if (!observe) return undefined;
		// Without a threshold or window shares there is nothing to observe against.
		if (
			observationalMemory.observerThresholdTokens === undefined &&
			!observationalMemory.windowShares
		)
			return undefined;
		const maxBatches = unlimited
			? Number.POSITIVE_INFINITY
			: observationalMemory.maxObserverBatchesAfterTurn || Number.POSITIVE_INFINITY;
		const scope = this.getObservationLogScope(persistence);
		const runner = this.getMemoryTaskRunner(memory, observationalMemory.lockTtlMs);
		const handle = runner.schedule<RunObservationLogObserverResult>(
			{ ...scope, taskKind: 'observer' },
			async () =>
				await this.observeInBatches(
					run,
					maxBatches,
					async (maxBatchTokens) =>
						await runObservationLogObserver({
							memory,
							...scope,
							observationLogTailLimit: observationalMemory.observationLogTailLimit ?? 0,
							observe,
							maxBatchTokens,
							tokenCounter: this.tokenCounter,
							executionCounter,
							telemetry,
							modelFetch: this.config.modelFetch,
							functionId: this.config.functionId,
							// Usage is forwarded inside the observer right after the model
							// call (before persistence), so a billed observer turn is
							// priced even when post-processing throws.
							onUsage: onSideCallUsage
								? (model, usage) => {
										void this.forwardSideCallUsage(onSideCallUsage, 'observer', model, usage);
									}
								: undefined,
						}),
				),
		);
		void handle.done.then((result) => {
			if (result.status === 'failed') this.noteObserverFailure(run);
		});
		return handle;
	}

	/**
	 * Read the backlog one batch per Observer call, each sized to fit the
	 * memory model, until it is read, `maxBatches` is reached, or a call does
	 * not advance the cursor. Returns the last advancing result, so callers
	 * see that the cursor moved.
	 */
	private async observeInBatches(
		run: ObserverRunState,
		maxBatches: number,
		observeBatch: (maxBatchTokens: number | undefined) => Promise<RunObservationLogObserverResult>,
	): Promise<RunObservationLogObserverResult> {
		const maxBatchTokens = (await this.resolveBudget())?.thresholds.observerBatch;
		let outcome: RunObservationLogObserverResult | undefined;
		for (let batch = 0; batch < maxBatches && !run.stopped; batch++) {
			const result = await observeBatch(maxBatchTokens);
			const ran = result.status === 'ran';
			const advanced = ran && result.cursorAdvanced;
			if (advanced) run.consecutiveFailures = 0;
			else if (ran) this.noteObserverFailure(run);
			if (!outcome || advanced || !didAdvanceObserver(outcome)) outcome = result;
			if (!advanced || !(ran && result.moreToObserve)) break;
		}
		return outcome ?? { status: 'skipped', reason: 'run-disabled' };
	}

	private async scheduleObservationLogJobs(
		list: AgentMessageList,
		persistence: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
		telemetry?: BuiltTelemetry,
		onSideCallUsage?: OnSideCallUsage,
	): Promise<void> {
		const { memory, observationalMemory } = this.config;
		if (!memory || !observationalMemory || !hasObservationLogStore(memory)) return;

		const scope = this.getObservationLogScope(persistence);
		const runner = this.getMemoryTaskRunner(memory, observationalMemory.lockTtlMs);
		const midRunTask = this.midRunObserverTask;
		if (midRunTask?.result) this.midRunObserverTask = undefined;
		let observerHandle: ScopedMemoryTaskHandle<RunObservationLogObserverResult> | undefined;
		if (
			midRunTask &&
			!midRunTask.result &&
			midRunTask.handle.observationScopeId === scope.observationScopeId
		) {
			// A mid-run task still in flight only covers up to its boundary.
			// Queue the tail observer behind it on the per-scope runner instead
			// of joining and dropping the post-boundary tail.
			void midRunTask.handle.done.then(() => {
				if (this.midRunObserverTask === midRunTask) this.midRunObserverTask = undefined;
			});
			observerHandle = this.scheduleObserverTask(
				persistence,
				executionCounter,
				telemetry,
				onSideCallUsage,
			);
		} else if (
			this.cursorAdvancedThisRun ||
			(midRunTask?.result !== undefined && didAdvanceCursor(midRunTask.result))
		) {
			// Mid-run advanced the cursor this run — either activated at a boundary
			// or settled after the last one: observe the tail regardless of the
			// visible-window budget, which the mask shrank below threshold.
			observerHandle = this.scheduleObserverTask(
				persistence,
				executionCounter,
				telemetry,
				onSideCallUsage,
			);
		} else {
			const decision = await this.shouldScheduleObserver(list, persistence.threadId);
			if (decision)
				observerHandle = this.scheduleObserverTask(
					persistence,
					executionCounter,
					telemetry,
					onSideCallUsage,
					{ unlimited: decision === 'full' },
				);
		}

		const reflect = observationalMemory.reflect;
		const reflectorThresholdTokens = (await this.resolveBudget())?.thresholds.reflect;
		if (reflect && reflectorThresholdTokens !== undefined) {
			const scheduleReflector = async () =>
				await this.scheduleMemoryTask(runner, scope, 'reflector', async () => {
					const result = await runObservationLogReflector({
						memory,
						...scope,
						reflectorThresholdTokens,
						reflect,
						tokenCounter: this.tokenCounter,
						executionCounter,
						telemetry,
						modelFetch: this.config.modelFetch,
						functionId: this.config.functionId,
						// Usage is forwarded inside the reflector right after the model
						// call (before persistence), so a billed reflector turn is
						// priced even when post-processing throws.
						onUsage: onSideCallUsage
							? (model, usage) => {
									void this.forwardSideCallUsage(onSideCallUsage, 'reflector', model, usage);
								}
							: undefined,
					});
					return result;
				});
			if (observationalMemory.reflectionMode !== 'afterObserve') {
				void scheduleReflector();
			} else {
				// Reflect only when this run added observations; otherwise the log is
				// unchanged. A mid-run Observer counts too, even when the tail Observer
				// does not advance. Chained, so the end of the turn never waits on it.
				const advancedMidRun = this.cursorAdvancedThisRun;
				const pending = [midRunTask?.handle, observerHandle].filter(
					(handle): handle is ScopedMemoryTaskHandle<RunObservationLogObserverResult> =>
						handle !== undefined,
				);
				if (advancedMidRun || pending.length > 0) {
					void Promise.all(pending.map(async (handle) => await handle.done)).then(
						async (results) => {
							if (advancedMidRun || results.some(didAdvanceCursor)) await scheduleReflector();
						},
					);
				}
			}
		}
	}

	private async shouldScheduleObserver(
		list: AgentMessageList,
		threadId: string,
	): Promise<'full' | 'batches' | false> {
		try {
			const budget = await this.resolveBudget();
			if (!budget) return false;
			const { thresholds } = budget;
			// A turn that ended at the hard limit observes now, so the next turn
			// can resume from notes instead of starting over the limit.
			if ((await this.requestSize.estimate(list)) >= budget.hardLimit) return 'full';
			const cursor = this.knownCursor;
			// Count only unobserved tokens: the window can also hold observed ones.
			let unobserved = 0;
			for (const message of list.llmVisibleMessages()) {
				if (cursor && !isAfterPoint(message, cursor)) continue;
				unobserved += this.requestSize.messageTokens(message.id);
			}
			return unobserved >= (cursor ? thresholds.observeNew : thresholds.observeFirst)
				? 'batches'
				: false;
		} catch (error) {
			logger.warn('Post-turn observer gating failed; skipping observation this turn', {
				error,
				threadId,
			});
			return false;
		}
	}

	/**
	 * Drains every pending candidate for the resource in the background, so a
	 * run never waits on memory work. Scheduled before each run to pick up
	 * candidates a crashed or failed earlier job left behind, and after runs
	 * that flagged memory.
	 */
	private scheduleEpisodicMemoryJob(
		persistence: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
		telemetry?: BuiltTelemetry,
		onSideCallUsage?: OnSideCallUsage,
	): void {
		const capture = resolveEpisodicMemoryCapture(this.config, persistence);
		if (!capture) return;

		this.scheduleEpisodicMemoryTask(capture.memory, capture.scope, async () => {
			let result;
			do {
				result = await runEpisodicMemoryCandidateProcessor({
					...capture,
					executionCounter,
					telemetry,
					modelFetch: this.config.modelFetch,
					functionId: this.config.functionId,
					agentName: this.config.name,
					// Each embed/consolidate usage is forwarded inside the processor
					// the moment its model call resolves, before persistence, so a
					// billed turn is priced even when a later write throws.
					// Returning usageReports here would double-count.
					onUsage: onSideCallUsage
						? (model, usage) => {
								void this.forwardSideCallUsage(onSideCallUsage, 'episodic', model, usage);
							}
						: undefined,
				});
			} while (result.status === 'ran');
		});
	}

	private scheduleEpisodicMemoryTask(
		memory: BuiltMemory,
		scope: EpisodicMemoryScope,
		task: () => Promise<void>,
	): void {
		const id = crypto.randomUUID();
		const keys = [
			`resource:${scope.episodic?.writeScopeId ?? scope.resourceId}`,
			`thread:${scope.threadId}`,
		];
		const previous: Array<Promise<unknown>> = [];
		for (const key of keys) {
			const running = this.episodicMemoryTasks.get(key);
			if (running) previous.push(running);
		}
		const done = Promise.allSettled(previous).then(
			async () => await this.runEpisodicMemoryTask(memory, scope, id, task),
		);
		const queued = done.finally(() => {
			for (const key of keys) {
				if (this.episodicMemoryTasks.get(key) === queued) {
					this.episodicMemoryTasks.delete(key);
				}
			}
		});
		for (const key of keys) this.episodicMemoryTasks.set(key, queued);
		this.backgroundTasks.track(queued);
	}

	private async runEpisodicMemoryTask(
		memory: BuiltMemory,
		scope: EpisodicMemoryScope,
		holderId: string,
		task: () => Promise<void>,
	): Promise<void> {
		const taskLock = memory.episodic?.taskLock;
		let lock: EpisodicMemoryTaskLockHandle | null = null;
		try {
			if (taskLock) {
				lock = await taskLock.acquire(scope, {
					holderId,
					ttlMs: this.config.observationalMemory?.lockTtlMs ?? DEFAULT_MEMORY_TASK_LOCK_TTL_MS,
				});
				if (!lock) return;
			}
			await task();
		} catch (error) {
			const message = 'Episodic memory processing task failed';
			logger.warn(message, { error, ...scope });
			this.eventBus.emit({ type: AgentEvent.Error, message, error, source: 'episodic-memory' });
		} finally {
			if (lock) {
				await this.releaseEpisodicMemoryTaskLock(taskLock, lock, scope);
			}
		}
	}

	private async releaseEpisodicMemoryTaskLock(
		taskLock: EpisodicMemoryTaskLockMethods | undefined,
		lock: EpisodicMemoryTaskLockHandle,
		scope: EpisodicMemoryScope,
	): Promise<void> {
		try {
			await taskLock?.release(lock);
		} catch (error) {
			logger.warn('Episodic memory processing lock release failed', { error, ...scope });
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

	/**
	 * Price a side-call model turn and forward it to the host so it can add the
	 * USD cost to the execution and thread totals. An unpriced call is still
	 * forwarded without `cost`, so the host can bill its tokens. Best-effort: a
	 * host failure is logged and never fails the memory task.
	 */
	private async forwardSideCallUsage(
		onSideCallUsage: OnSideCallUsage | undefined,
		task: SideCallTask,
		model: string | undefined,
		usage: TokenUsage | undefined,
	): Promise<void> {
		if (!onSideCallUsage || !usage || !model) return;
		try {
			const cost = await computeSideCallCost(
				model,
				usage,
				this.config.promptCaching,
				this.config.modelFetch,
			);
			await onSideCallUsage({
				task,
				model,
				usage,
				...(cost !== undefined ? { cost } : {}),
				reportId: crypto.randomUUID(),
			});
		} catch (error) {
			logger.warn('Failed to report side-call usage', { error, task });
		}
	}
}
