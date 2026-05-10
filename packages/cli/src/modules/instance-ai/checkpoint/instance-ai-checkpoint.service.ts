import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type {
	BackgroundTaskManager,
	ManagedBackgroundTask,
	PlannedTaskCoordinator,
	PlannedTaskGraph,
	PlannedTaskRecord,
	RunStateRegistry,
} from '@n8n/instance-ai';

type CheckpointFollowUp = { isCheckpointFollowUp: true; checkpointTaskId: string };

type PlannedTaskState = {
	plannedTaskService: Pick<PlannedTaskCoordinator, 'getGraph' | 'markCheckpointFailed'>;
};

export class InstanceAiCheckpointService {
	private readonly pendingCheckpointReentries = new Map<string, Set<string>>();

	constructor(
		private readonly deps: {
			backgroundTasks: Pick<BackgroundTaskManager, 'getRunningTasksByParentCheckpoint'>;
			runState: Pick<
				RunStateRegistry<User>,
				'getActiveRunId' | 'hasSuspendedRun' | 'getThreadResearchMode'
			>;
			logger: Pick<Logger, 'debug' | 'warn' | 'error'>;
			createPlannedTaskState: () => Promise<PlannedTaskState>;
			buildPlannedTaskFollowUpMessage: (
				type: 'synthesize' | 'replan' | 'checkpoint',
				graph: PlannedTaskGraph,
				options?: { failedTask?: PlannedTaskRecord; checkpoint?: PlannedTaskRecord },
			) => string;
			startInternalFollowUpRun: (
				user: User,
				threadId: string,
				message: string,
				researchMode: boolean | undefined,
				messageGroupId?: string,
				isReplanFollowUp?: boolean,
				checkpoint?: CheckpointFollowUp,
			) => Promise<string>;
			syncPlannedTasksToUi: (threadId: string, graph: PlannedTaskGraph) => Promise<void>;
			schedulePlannedTasks: (user: User, threadId: string) => Promise<void>;
		},
	) {}

	queuePendingCheckpointReentry(threadId: string, checkpointTaskId: string): void {
		let set = this.pendingCheckpointReentries.get(threadId);
		if (!set) {
			set = new Set();
			this.pendingCheckpointReentries.set(threadId, set);
		}
		set.add(checkpointTaskId);
	}

	async drainPendingCheckpointReentries(user: User, threadId: string): Promise<void> {
		const set = this.pendingCheckpointReentries.get(threadId);
		if (!set || set.size === 0) return;
		const snapshot = [...set];
		for (const checkpointTaskId of snapshot) {
			if (
				this.deps.runState.getActiveRunId(threadId) ||
				this.deps.runState.hasSuspendedRun(threadId)
			) {
				return;
			}
			const siblings = this.deps.backgroundTasks.getRunningTasksByParentCheckpoint(
				threadId,
				checkpointTaskId,
			);
			if (siblings.length > 0) continue;
			set.delete(checkpointTaskId);
			await this.reenterCheckpointById(user, threadId, checkpointTaskId);
		}
		if (set.size === 0) this.pendingCheckpointReentries.delete(threadId);
	}

	async maybeReenterParentCheckpoint(
		user: User,
		threadId: string,
		task: ManagedBackgroundTask,
	): Promise<boolean> {
		const parentCheckpointId = task.parentCheckpointId;
		if (!parentCheckpointId) return false;

		const siblings = this.deps.backgroundTasks
			.getRunningTasksByParentCheckpoint(threadId, parentCheckpointId)
			.filter((t) => t.taskId !== task.taskId);
		if (siblings.length > 0) return false;

		if (
			this.deps.runState.getActiveRunId(threadId) ||
			this.deps.runState.hasSuspendedRun(threadId)
		) {
			return false;
		}

		return await this.reenterCheckpointById(
			user,
			threadId,
			parentCheckpointId,
			task.messageGroupId,
		);
	}

	async finalizeCheckpointFollowUp(
		user: User,
		threadId: string,
		checkpointTaskId: string,
	): Promise<void> {
		try {
			const { plannedTaskService } = await this.deps.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const task = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (task && task.status === 'running') {
				const inflightChildren = this.deps.backgroundTasks.getRunningTasksByParentCheckpoint(
					threadId,
					checkpointTaskId,
				);
				if (inflightChildren.length > 0) {
					this.deps.logger.debug(
						'Checkpoint run ended with in-flight child tasks — deferring finalization',
						{
							threadId,
							checkpointTaskId,
							inflightTaskIds: inflightChildren.map((t) => t.taskId),
						},
					);
				} else {
					this.deps.logger.warn(
						'Checkpoint run ended without reporting completion — marking failed',
						{
							threadId,
							checkpointTaskId,
						},
					);
					await plannedTaskService.markCheckpointFailed(threadId, checkpointTaskId, {
						error: 'Checkpoint run ended without reporting completion',
					});
					const nextGraph = await plannedTaskService.getGraph(threadId);
					if (nextGraph) {
						await this.deps.syncPlannedTasksToUi(threadId, nextGraph);
					}
				}
			}
		} catch (error) {
			this.deps.logger.error('Checkpoint finalization failed', {
				threadId,
				checkpointTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		await this.deps.schedulePlannedTasks(user, threadId);
	}

	clearThread(threadId: string): void {
		this.pendingCheckpointReentries.delete(threadId);
	}

	getPendingForThread(threadId: string): Set<string> | undefined {
		return this.pendingCheckpointReentries.get(threadId);
	}

	private async reenterCheckpointById(
		user: User,
		threadId: string,
		checkpointTaskId: string,
		messageGroupId?: string,
	): Promise<boolean> {
		try {
			const { plannedTaskService } = await this.deps.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const checkpoint = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (!graph || !checkpoint || checkpoint.kind !== 'checkpoint') return false;
			if (checkpoint.status !== 'running') return false;

			const startedRunId = await this.deps.startInternalFollowUpRun(
				user,
				threadId,
				this.deps.buildPlannedTaskFollowUpMessage('checkpoint', graph, { checkpoint }),
				this.deps.runState.getThreadResearchMode(threadId),
				messageGroupId,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId },
			);
			if (!startedRunId) return false;
			this.deps.logger.debug('Re-entered checkpoint follow-up', {
				threadId,
				checkpointTaskId,
				messageGroupId,
			});
			return true;
		} catch (error) {
			this.deps.logger.error('Failed to re-enter checkpoint follow-up', {
				threadId,
				checkpointTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}
}
