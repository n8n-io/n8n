import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type {
	ActiveRunState,
	BackgroundTaskManager,
	InstanceAiTraceContext,
	ManagedBackgroundTask,
	SpawnBackgroundTaskOptions,
	SpawnBackgroundTaskResult,
	SuspendedRunState,
} from '@n8n/instance-ai';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { AUTO_FOLLOW_UP_MESSAGE } from '../internal-messages';
import { INSTANCE_AI_RUN_TIMEOUT_REASON } from '../liveness';
import type { DbSnapshotStorage } from '../storage/db-snapshot-storage';

type BackgroundTasks = Pick<
	BackgroundTaskManager,
	| 'cancelAll'
	| 'cancelTask'
	| 'cancelThread'
	| 'getRunningTasks'
	| 'getTaskSnapshots'
	| 'queueCorrection'
	| 'spawn'
>;

type RunState = {
	startRun: (options: { threadId: string; user: User }) => {
		runId: string;
		abortController: AbortController;
		messageGroupId?: string;
	};
	clearActiveRun: (threadId: string) => void;
	cancelThread: (threadId: string) => {
		active?: ActiveRunState;
		suspended?: SuspendedRunState<User>;
	};
	getMessageGroupId: (threadId: string) => string | undefined;
	getThreadUser: (threadId: string) => User | undefined;
	getActiveRunId: (threadId: string) => string | undefined;
	hasSuspendedRun: (threadId: string) => boolean;
	getThreadResearchMode: (threadId: string) => boolean | undefined;
};

type Liveness = {
	backgroundTaskIdleTimeoutMs: number;
	hasTimedOutActiveRunThread: (threadId: string) => boolean;
	markRunTimedOut: (runId: string) => void;
};

export type InstanceAiBackgroundTaskServiceDeps = {
	orchestratorAgentId: string;
	backgroundTasks: BackgroundTasks;
	runState: RunState;
	liveness: Liveness;
	eventBus: { publish: (threadId: string, event: InstanceAiEvent) => void };
	logger: Pick<Logger, 'debug' | 'warn'>;
	dbSnapshotStorage: DbSnapshotStorage;
	finalizeDetachedTraceRun: (
		taskId: string,
		traceContext: InstanceAiTraceContext | undefined,
		options: {
			status: 'completed' | 'failed' | 'cancelled';
			outputs?: Record<string, unknown>;
			error?: string;
			metadata?: Record<string, unknown>;
		},
	) => Promise<void>;
	finalizeBackgroundTaskTracing: (
		task: ManagedBackgroundTask,
		status: 'completed' | 'failed' | 'cancelled',
	) => Promise<void>;
	handlePlannedTaskSettlement: (
		user: User,
		task: ManagedBackgroundTask,
		status: 'succeeded' | 'failed' | 'cancelled',
	) => Promise<void>;
	recordBackgroundTerminalOutcome: (task: ManagedBackgroundTask) => Promise<void>;
	saveAgentTreeSnapshot: (
		threadId: string,
		runId: string,
		snapshotStorage: DbSnapshotStorage,
		isUpdate?: boolean,
		overrideMessageGroupId?: string,
	) => Promise<void>;
	startInternalFollowUpRun: (
		user: User,
		threadId: string,
		message: string,
		researchMode?: boolean,
		messageGroupId?: string,
	) => Promise<string | undefined>;
	queuePendingCheckpointReentry: (threadId: string, checkpointTaskId: string) => void;
	maybeReenterParentCheckpoint: (
		user: User,
		threadId: string,
		task: ManagedBackgroundTask,
	) => Promise<boolean>;
	cancelAwaitingApprovalPlan: (threadId: string) => Promise<void>;
	finalizeCancelledSuspendedRun: (
		suspended: SuspendedRunState<User>,
		reason?: string,
	) => Promise<void>;
};

export class InstanceAiBackgroundTaskService {
	constructor(private readonly deps: InstanceAiBackgroundTaskServiceDeps) {}

	getTaskSnapshots(threadId: string): ReturnType<BackgroundTaskManager['getTaskSnapshots']> {
		return this.deps.backgroundTasks.getTaskSnapshots(threadId);
	}

	sendCorrectionToTask(
		threadId: string,
		taskId: string,
		correction: string,
	): 'queued' | 'task-completed' | 'task-not-found' {
		return this.deps.backgroundTasks.queueCorrection(threadId, taskId, correction);
	}

	cancelRun(threadId: string, reason = 'user_cancelled'): void {
		const cancelledTasks = this.deps.backgroundTasks.cancelThread(threadId);
		const user = this.deps.runState.getThreadUser(threadId);
		for (const task of cancelledTasks) {
			void this.deps.finalizeBackgroundTaskTracing(task, 'cancelled');
			this.deps.eventBus.publish(threadId, {
				type: 'agent-completed',
				runId: task.runId,
				agentId: task.agentId,
				payload: {
					role: task.role,
					result: '',
					error: reason === INSTANCE_AI_RUN_TIMEOUT_REASON ? 'Timed out' : 'Cancelled by user',
				},
			});
			void this.recordTerminalOutcomeAndSnapshot(threadId, task);
			if (user) {
				void this.deps.handlePlannedTaskSettlement(user, task, 'cancelled');
			}
		}

		void this.deps.cancelAwaitingApprovalPlan(threadId);

		const { active, suspended } = this.deps.runState.cancelThread(threadId);
		if (active) {
			if (reason === INSTANCE_AI_RUN_TIMEOUT_REASON)
				this.deps.liveness.markRunTimedOut(active.runId);
			active.abortController.abort();
			return;
		}

		if (suspended) {
			if (reason === INSTANCE_AI_RUN_TIMEOUT_REASON) {
				this.deps.liveness.markRunTimedOut(suspended.runId);
			}
			suspended.abortController.abort();
			void this.deps.finalizeCancelledSuspendedRun(suspended, reason);
		}
	}

	cancelBackgroundTask(threadId: string, taskId: string): void {
		const task = this.deps.backgroundTasks.cancelTask(threadId, taskId);
		if (!task) return;

		void this.deps.finalizeBackgroundTaskTracing(task, 'cancelled');
		this.deps.eventBus.publish(threadId, {
			type: 'agent-completed',
			runId: task.runId,
			agentId: task.agentId,
			payload: { role: task.role, result: '', error: 'Cancelled by user' },
		});

		void this.recordTerminalOutcomeAndSnapshot(threadId, task);

		const user = this.deps.runState.getThreadUser(threadId);
		if (user) {
			void this.deps.handlePlannedTaskSettlement(user, task, 'cancelled');
		}
	}

	cancelAllBackgroundTasks(): number {
		const cancelled = this.deps.backgroundTasks.cancelAll();
		for (const task of cancelled) {
			void this.deps.finalizeBackgroundTaskTracing(task, 'cancelled');
		}
		return cancelled.length;
	}

	async cancelThreadForCleanup(threadId: string): Promise<void> {
		for (const task of this.deps.backgroundTasks.cancelThread(threadId)) {
			task.abortController.abort();
			await this.deps.finalizeBackgroundTaskTracing(task, 'cancelled');
		}
	}

	async cancelAllForShutdown(): Promise<void> {
		for (const task of this.deps.backgroundTasks.cancelAll()) {
			task.abortController.abort();
			await this.deps.finalizeBackgroundTaskTracing(task, 'cancelled');
		}
	}

	async startStuckBackgroundTaskForTest(
		user: User,
		threadId: string,
	): Promise<{
		threadId: string;
		runId: string;
		messageGroupId: string;
		taskId: string;
		agentId: string;
		timeoutAt: number;
	}> {
		const messageId = `msg_${nanoid()}`;
		const { runId, messageGroupId } = this.deps.runState.startRun({ threadId, user });
		if (!messageGroupId) {
			throw new UnexpectedError('Failed to create message group for timeout simulation');
		}
		const taskId = `task_${nanoid()}`;
		const agentId = `agent_${nanoid()}`;

		this.deps.eventBus.publish(threadId, {
			type: 'run-start',
			runId,
			agentId: this.deps.orchestratorAgentId,
			userId: user.id,
			payload: { messageId, messageGroupId },
		});
		this.deps.eventBus.publish(threadId, {
			type: 'text-delta',
			runId,
			agentId: this.deps.orchestratorAgentId,
			responseId: `test-background-start:${runId}`,
			payload: { text: 'I started a background workflow-builder task.' },
		});
		this.deps.eventBus.publish(threadId, {
			type: 'agent-spawned',
			runId,
			agentId,
			payload: {
				parentId: this.deps.orchestratorAgentId,
				role: 'workflow-builder',
				tools: [],
				taskId,
				kind: 'builder',
				title: 'Building workflow',
				subtitle: 'Timeout simulation',
				goal: 'Simulate a stuck background task timeout',
			},
		});

		const outcome = this.deps.backgroundTasks.spawn({
			taskId,
			threadId,
			runId,
			role: 'workflow-builder',
			agentId,
			messageGroupId,
			run: async (signal) =>
				await new Promise<string>((resolve) => {
					signal.addEventListener('abort', () => resolve('aborted'), { once: true });
				}),
			onFailed: (task) => {
				this.deps.eventBus.publish(threadId, {
					type: 'agent-completed',
					runId,
					agentId,
					payload: {
						role: task.role,
						result: '',
						error: task.error ?? 'Unknown error',
					},
				});
			},
			onSettled: async (task) => {
				await this.deps.recordBackgroundTerminalOutcome(task);
				await this.deps.saveAgentTreeSnapshot(
					threadId,
					runId,
					this.deps.dbSnapshotStorage,
					true,
					messageGroupId,
				);
			},
		});

		if (outcome.status !== 'started') {
			throw new UnexpectedError('Failed to start stuck background task simulation');
		}

		this.deps.runState.clearActiveRun(threadId);
		this.deps.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: this.deps.orchestratorAgentId,
			userId: user.id,
			payload: { status: 'completed' },
		});

		return {
			threadId,
			runId,
			messageGroupId,
			taskId,
			agentId,
			timeoutAt: outcome.task.lastActivityAt + this.deps.liveness.backgroundTaskIdleTimeoutMs + 1,
		};
	}

	spawnBackgroundTask(
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: DbSnapshotStorage,
		messageGroupIdOverride?: string,
	): SpawnBackgroundTaskResult {
		const outcome = this.deps.backgroundTasks.spawn({
			taskId: opts.taskId,
			threadId: opts.threadId,
			runId,
			role: opts.role,
			agentId: opts.agentId,
			messageGroupId: messageGroupIdOverride ?? this.deps.runState.getMessageGroupId(opts.threadId),
			plannedTaskId: opts.plannedTaskId,
			workItemId: opts.workItemId,
			traceContext: opts.traceContext,
			dedupeKey: opts.dedupeKey,
			parentCheckpointId: opts.parentCheckpointId,
			run: opts.run,
			onLimitReached: async (errorMessage) => {
				await this.deps.finalizeDetachedTraceRun(opts.taskId, opts.traceContext, {
					status: 'failed',
					outputs: {
						taskId: opts.taskId,
						agentId: opts.agentId,
						role: opts.role,
					},
					error: errorMessage,
					metadata: {
						...(opts.plannedTaskId ? { planned_task_id: opts.plannedTaskId } : {}),
						...(opts.workItemId ? { work_item_id: opts.workItemId } : {}),
					},
				});
				this.deps.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: {
						role: opts.role,
						result: '',
						error: errorMessage,
					},
				});
			},
			onCompleted: async (task) => {
				await this.deps.finalizeBackgroundTaskTracing(task, 'completed');
				this.deps.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result: task.result ?? '' },
				});

				const user = this.deps.runState.getThreadUser(opts.threadId);
				if (user) {
					await this.deps.handlePlannedTaskSettlement(user, task, 'succeeded');
				}
			},
			onFailed: async (task) => {
				await this.deps.finalizeBackgroundTaskTracing(task, 'failed');
				this.deps.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result: '', error: task.error ?? 'Unknown error' },
				});

				const user = this.deps.runState.getThreadUser(opts.threadId);
				if (user) {
					await this.deps.handlePlannedTaskSettlement(user, task, 'failed');
				}
			},
			onSettled: async (task) => {
				await this.deps.recordBackgroundTerminalOutcome(task);
				await this.deps.saveAgentTreeSnapshot(
					opts.threadId,
					runId,
					snapshotStorage,
					true,
					task.messageGroupId,
				);

				if (task.plannedTaskId) return;

				const parentCheckpointId = task.parentCheckpointId;
				if (parentCheckpointId) {
					const user = this.deps.runState.getThreadUser(opts.threadId);
					if (!user) {
						this.deps.queuePendingCheckpointReentry(opts.threadId, parentCheckpointId);
						return;
					}
					const reentered = await this.deps.maybeReenterParentCheckpoint(user, opts.threadId, task);
					if (!reentered) {
						this.deps.queuePendingCheckpointReentry(opts.threadId, parentCheckpointId);
					}
					return;
				}

				const remaining = this.deps.backgroundTasks.getRunningTasks(opts.threadId);
				const hasActiveRun = !!this.deps.runState.getActiveRunId(opts.threadId);
				const hasSuspendedRun = this.deps.runState.hasSuspendedRun(opts.threadId);
				if (remaining.length === 0 && !hasActiveRun && !hasSuspendedRun) {
					if (this.deps.liveness.hasTimedOutActiveRunThread(opts.threadId)) {
						this.deps.logger.debug('Skipping background auto-follow-up after active run timeout', {
							threadId: opts.threadId,
							taskId: task.taskId,
						});
						return;
					}
					const user = this.deps.runState.getThreadUser(opts.threadId);
					if (user) {
						const payload = JSON.stringify(
							{
								role: opts.role,
								status: task.result ? 'completed' : task.error ? 'failed' : 'finished',
								result: task.result ?? undefined,
								outcome: task.outcome ?? undefined,
								error: task.error ?? undefined,
							},
							null,
							2,
						);
						await this.deps.startInternalFollowUpRun(
							user,
							opts.threadId,
							`<background-task-completed>\n${payload}\n</background-task-completed>\n\n${AUTO_FOLLOW_UP_MESSAGE}`,
							this.deps.runState.getThreadResearchMode(opts.threadId),
							task.messageGroupId,
						);
					}
				}
			},
		});

		if (outcome.status === 'started') {
			return { status: 'started', taskId: outcome.task.taskId, agentId: outcome.task.agentId };
		}
		if (outcome.status === 'duplicate') {
			this.deps.logger.warn('Background task dispatch deduped — task already in flight', {
				threadId: opts.threadId,
				requestedTaskId: opts.taskId,
				existingTaskId: outcome.existing.taskId,
				plannedTaskId: opts.dedupeKey?.plannedTaskId,
				workflowId: opts.dedupeKey?.workflowId,
				role: opts.role,
			});
			void this.deps.finalizeDetachedTraceRun(opts.taskId, opts.traceContext, {
				status: 'cancelled',
				outputs: {
					taskId: opts.taskId,
					agentId: opts.agentId,
					role: opts.role,
					deduped_to: outcome.existing.taskId,
				},
				metadata: {
					deduped: true,
					existing_task_id: outcome.existing.taskId,
					...(opts.plannedTaskId ? { planned_task_id: opts.plannedTaskId } : {}),
					...(opts.workItemId ? { work_item_id: opts.workItemId } : {}),
				},
			});
			this.deps.eventBus.publish(opts.threadId, {
				type: 'agent-completed',
				runId,
				agentId: opts.agentId,
				payload: {
					role: opts.role,
					result: '',
					error: `Deduped: task already in flight as ${outcome.existing.taskId}`,
				},
			});
			return {
				status: 'duplicate',
				existing: {
					taskId: outcome.existing.taskId,
					agentId: outcome.existing.agentId,
					role: outcome.existing.role,
					plannedTaskId: outcome.existing.plannedTaskId,
					workItemId: outcome.existing.workItemId,
				},
			};
		}
		return { status: 'limit-reached' };
	}

	private async recordTerminalOutcomeAndSnapshot(
		threadId: string,
		task: ManagedBackgroundTask,
	): Promise<void> {
		await this.deps.recordBackgroundTerminalOutcome(task);
		await this.deps.saveAgentTreeSnapshot(
			threadId,
			task.runId,
			this.deps.dbSnapshotStorage,
			true,
			task.messageGroupId,
		);
	}
}
