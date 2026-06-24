import {
	getEpisodicMemoryScope,
	hasEpisodicMemoryStore,
	isEpisodicMemoryEnabled,
	runEpisodicMemoryIndexer,
} from './episodic-memory';
import { createFilteredLogger } from '../logger';
import { saveMessagesToThread } from './memory-store';
import {
	runObservationLogObserver,
	type ObservationLogObserverMemory,
} from './observation-log-observer';
import { runObservationLogReflector } from './observation-log-reflector';
import { renderObservationLog } from './observation-log-renderer';
import { hasObservationLogStore, hasObservationLogTaskLockStore } from './observation-log-store';
import { ScopedMemoryTaskRunner } from './scoped-memory-task-runner';
import { stripOrphanedToolMessages } from './strip-orphaned-tool-messages';
import type {
	AgentExecutionCounter,
	BuiltMemory,
	EpisodicMemoryTaskLockHandle,
	EpisodicMemoryTaskLockMethods,
} from '../../types';
import { AgentEvent } from '../../types/runtime/event';
import type { AgentPersistenceOptions, ExecutionOptions, RunOptions } from '../../types/sdk/agent';
import type { AgentDbMessage } from '../../types/sdk/message';
import type { ObservationLogScope, ObservationLogTaskKind } from '../../types/sdk/observation-log';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import type { AgentMessageList } from '../model/message-list';
import type { BackgroundTaskTracker } from '../state/background-task-tracker';
import type { AgentEventBus } from '../state/event-bus';

const DEFAULT_MEMORY_TASK_LOCK_TTL_MS = 30_000;
const logger = createFilteredLogger();

function hasFunctionProperty<K extends PropertyKey>(
	value: object,
	property: K,
): value is Record<K, (...args: never[]) => unknown> {
	return property in value && typeof Reflect.get(value, property) === 'function';
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

	constructor(
		private readonly config: AgentRuntimeConfig,
		private readonly backgroundTasks: BackgroundTaskTracker,
		private readonly eventBus: AgentEventBus,
	) {}

	async loadHistoryMessages(persistence: AgentPersistenceOptions): Promise<AgentDbMessage[]> {
		const memory = this.config.memory;

		if (!memory) return [];

		const { threadId, resourceId } = persistence;

		if (this.config.observationalMemory && hasObservationLogObserverMemory(memory)) {
			const cursor = await memory.getCursor(threadId);

			// Trust the cursor only when an observation log actually stands in for
			// the pre-cursor messages. If the cursor advanced without observations
			// being persisted (cursor/observation desync), loading only
			// post-cursor messages would silently drop the entire prior
			// conversation, so we fall back to the full history instead.
			if (cursor && (await this.hasActiveObservations(memory, threadId))) {
				return await memory.getMessagesForObservationScope(threadId, {
					since: {
						sinceCreatedAt: cursor.lastObservedAt,
						sinceMessageId: cursor.lastObservedMessageId,
					},
				});
			}
		}

		return await memory.getMessages(threadId, {
			resourceId,
		});
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
		if (this.config.memory && options?.persistence?.threadId) {
			const memMessages = await this.loadHistoryMessages(options.persistence);

			if (memMessages.length > 0) {
				list.addHistory(stripOrphanedToolMessages(memMessages));
			}
		}

		await this.setListObservationLogMemory(list, options?.persistence);
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
		if (!this.config.memory || !options?.persistence) return;
		const input = list.inputDelta();
		if (input.length === 0) return;
		try {
			await saveMessagesToThread(
				this.config.memory,
				options.persistence.threadId,
				options.persistence.resourceId,
				input,
			);
		} catch (error) {
			// Best-effort: the end-of-turn save still persists the input on a
			// completed turn, so a transient failure here must not abort the turn.
			// Only an uncompleted turn whose eager save also failed loses the input.
			logger.warn('Failed to eagerly persist input messages', {
				error,
				threadId: options.persistence.threadId,
			});
		}
	}

	/** Persist the current-turn delta to memory and schedule background indexing. */
	async saveToMemory(
		list: AgentMessageList,
		options: (RunOptions & ExecutionOptions) | undefined,
	): Promise<void> {
		if (!this.config.memory || !options?.persistence) return;
		const delta = list.turnDelta();
		if (delta.length === 0) return;
		await saveMessagesToThread(
			this.config.memory,
			options.persistence.threadId,
			options.persistence.resourceId,
			delta,
		);

		// Memory jobs receive the execution counter so their LLM and embedding
		// usage contributes to token_count.

		const observationTasks = this.scheduleObservationLogJobs(
			options.persistence,
			options.executionCounter,
		);
		this.scheduleEpisodicMemoryJob(options.persistence, observationTasks, options.executionCounter);
	}

	private scheduleObservationLogJobs(
		persistence: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
	): Array<Promise<unknown>> {
		const { memory, observationalMemory } = this.config;
		if (!memory || !observationalMemory || !hasObservationLogStore(memory)) return [];

		const scope = this.getObservationLogScope(persistence);
		const runner = this.getMemoryTaskRunner(memory, observationalMemory.lockTtlMs);
		const observe = observationalMemory.observe;
		const observerThresholdTokens = observationalMemory.observerThresholdTokens;
		const tasks: Array<Promise<unknown>> = [];

		if (
			observe &&
			observerThresholdTokens !== undefined &&
			hasObservationLogObserverMemory(memory)
		) {
			tasks.push(
				this.scheduleMemoryTask(
					runner,
					scope,
					'observer',
					async () =>
						await runObservationLogObserver({
							memory,
							...scope,
							observerThresholdTokens,
							observationLogTailLimit: observationalMemory.observationLogTailLimit ?? 0,
							observe,
							executionCounter,
						}),
				),
			);
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
							executionCounter,
						}),
				),
			);
		}

		return tasks;
	}

	private scheduleEpisodicMemoryJob(
		persistence: AgentPersistenceOptions,
		observationTasks: Array<Promise<unknown>>,
		executionCounter?: AgentExecutionCounter,
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
