import type { TaskList } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	deriveWorkflowVerificationObligationFromOutcome,
	ThreadTaskStorage,
	WorkflowLoopStorage,
	type ManagedBackgroundTask,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type WorkflowBuildOutcome,
	type WorkflowVerificationObligation,
} from '@n8n/instance-ai';

import type { InProcessEventBus } from './event-bus/in-process-event-bus';
import type { TypeORMAgentMemory } from './storage/typeorm-agent-memory';
import {
	parseWorkflowBuildOutcome,
	type WorkflowVerificationObligationService,
} from './workflow-verification-obligation-service';

const ORCHESTRATOR_AGENT_ID = 'agent-001';

const BUILD_DESCRIPTION = 'Build workflow';
const VERIFY_DESCRIPTION = 'Verify workflow';

/** All user-facing checklist detail strings, kept in one place. */
const DETAIL = {
	building: 'Building workflow',
	waitingForBuild: 'Waiting for build',
	buildIncomplete: 'Build did not complete',
	verificationPending: 'Verification pending',
	verifying: 'Verifying workflow',
	needsSetup: 'Needs setup',
	couldNotVerify: 'Could not verify automatically',
	noWorkflow: 'No workflow to verify',
	submitted: 'Submitted',
	blocked: 'Blocked',
	cancelled: 'Cancelled',
} as const;

type TaskItem = TaskList['tasks'][number];
type TaskStatus = TaskItem['status'];

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Stable id for the synthetic "Verify workflow" row attached to a build task. */
function verifyRowId(buildTaskId: string): string {
	return `${buildTaskId}:verify`;
}

function formatVerifiedDetail(evidence: WorkflowVerificationObligation['evidence']): string {
	if (!evidence?.attempted || !evidence.success) return 'Verified';

	const parts = [
		evidence.executionId ? `execution ${evidence.executionId}` : '',
		typeof evidence.evidence?.producedOutputRows === 'number'
			? `${evidence.evidence.producedOutputRows} output rows`
			: '',
	].filter((part) => part.length > 0);
	return parts.length > 0 ? `Verified - ${parts.join(', ')}` : 'Verified';
}

/** Single source of truth for an obligation's user-facing detail string. */
function obligationDetail(obligation: WorkflowVerificationObligation): string {
	switch (obligation.status) {
		case 'pending_build':
			return DETAIL.building;
		case 'ready_to_verify':
			return DETAIL.verificationPending;
		case 'verifying':
			return DETAIL.verifying;
		case 'verified':
			return formatVerifiedDetail(obligation.evidence);
		case 'needs_setup':
			return DETAIL.needsSetup;
		case 'not_verifiable':
			return DETAIL.couldNotVerify;
		case 'blocked':
			return obligation.blockingReason ?? DETAIL.blocked;
	}
}

/** Single source of truth for an obligation's checklist status. */
function obligationStatus(obligation: WorkflowVerificationObligation): TaskStatus {
	switch (obligation.status) {
		case 'pending_build':
		case 'ready_to_verify':
		case 'verifying':
			return 'in_progress';
		case 'verified':
		case 'needs_setup':
		case 'not_verifiable':
			return 'done';
		case 'blocked':
			return 'failed';
	}
}

function projectedPlannedStatus(status: PlannedTaskRecord['status']): TaskStatus {
	switch (status) {
		case 'planned':
			return 'todo';
		case 'running':
			return 'in_progress';
		case 'succeeded':
			return 'done';
		case 'failed':
			return 'failed';
		case 'cancelled':
			return 'cancelled';
	}
}

function plannedBuildDetail(task: PlannedTaskRecord): string | undefined {
	if (task.kind !== 'build-workflow') return undefined;
	if (task.status === 'running') return DETAIL.building;
	if (task.status === 'failed') return task.error ?? DETAIL.blocked;
	if (task.status === 'cancelled') return task.error ?? DETAIL.cancelled;

	const outcome = parseWorkflowBuildOutcome(task.outcome);
	if (!outcome) return task.status === 'succeeded' ? DETAIL.submitted : undefined;
	return outcome.submitted || outcome.workflowId ? DETAIL.submitted : undefined;
}

/** Render the synthetic "Verify workflow" row for a settled obligation. */
function verifyRow(buildTaskId: string, obligation: WorkflowVerificationObligation): TaskItem {
	if (obligation.status === 'pending_build') {
		return {
			id: verifyRowId(buildTaskId),
			description: VERIFY_DESCRIPTION,
			detail: DETAIL.waitingForBuild,
			status: 'todo',
		};
	}
	return {
		id: verifyRowId(buildTaskId),
		description: VERIFY_DESCRIPTION,
		detail: obligationDetail(obligation),
		status: obligationStatus(obligation),
	};
}

/** Render the "Build workflow" row for a direct (non-planned) build. */
function buildRow(
	buildTaskId: string,
	outcome: WorkflowBuildOutcome | undefined,
	obligation: WorkflowVerificationObligation,
): TaskItem {
	const submitted = outcome?.submitted === true || !!obligation.workflowId;
	const blockedBeforeSubmit = obligation.status === 'blocked' && !submitted;
	return {
		id: buildTaskId,
		description: BUILD_DESCRIPTION,
		detail: submitted ? DETAIL.submitted : obligationDetail(obligation),
		status: blockedBeforeSubmit ? 'failed' : submitted ? 'done' : 'in_progress',
	};
}

/** Build + verify rows for a direct build, derived from its obligation. */
function directTaskItems(
	buildTaskId: string,
	outcome: WorkflowBuildOutcome | undefined,
	obligation: WorkflowVerificationObligation,
): TaskItem[] {
	return [buildRow(buildTaskId, outcome, obligation), verifyRow(buildTaskId, obligation)];
}

/** Insert/replace items by id, preserving relative order. Returns whether anything changed. */
function upsertTaskItemsInOrder(
	existingTasks: TaskItem[],
	items: TaskItem[],
): { tasks: TaskItem[]; changed: boolean } {
	const tasks = [...existingTasks];
	let changed = false;

	for (const [itemIndex, item] of items.entries()) {
		const existingIndex = tasks.findIndex((task) => task.id === item.id);
		if (existingIndex >= 0) {
			if (taskItemsEqual(tasks[existingIndex], item)) continue;
			tasks[existingIndex] = item;
			changed = true;
			continue;
		}

		const previousItem = items[itemIndex - 1];
		const previousIndex = previousItem
			? tasks.findIndex((task) => task.id === previousItem.id)
			: -1;
		tasks.splice(previousIndex >= 0 ? previousIndex + 1 : tasks.length, 0, item);
		changed = true;
	}

	return { tasks, changed };
}

function taskItemsEqual(first: TaskItem, second: TaskItem): boolean {
	return (
		first.id === second.id &&
		first.description === second.description &&
		first.detail === second.detail &&
		first.status === second.status
	);
}

/**
 * Projects workflow build/verification lifecycle into the thread task checklist.
 *
 * Both direct builds and planned workflow tasks render the same way: a build row
 * plus a synthetic "Verify workflow" row derived from the workflow verification
 * obligation. The obligation → {detail, status} mapping lives here exactly once.
 */
export class WorkflowVerificationTaskProjector {
	constructor(
		private readonly agentMemory: TypeORMAgentMemory,
		private readonly eventBus: InProcessEventBus,
		private readonly logger: Logger,
		private readonly obligations: WorkflowVerificationObligationService,
	) {}

	/** Project a planned-task graph into a checklist, adding a verify row per build task. */
	async projectPlannedTaskList(threadId: string, graph: PlannedTaskGraph): Promise<TaskList> {
		const tasks: TaskItem[] = [];
		for (const task of graph.tasks) {
			tasks.push({
				id: task.id,
				description: task.title,
				detail: plannedBuildDetail(task),
				status: projectedPlannedStatus(task.status),
			});

			if (task.kind === 'build-workflow') {
				tasks.push(await this.projectPlannedVerifyRow(threadId, task));
			}
		}

		return { tasks };
	}

	private async projectPlannedVerifyRow(
		threadId: string,
		task: PlannedTaskRecord,
	): Promise<TaskItem> {
		const id = verifyRowId(task.id);

		if (task.status === 'planned' || task.status === 'running') {
			return {
				id,
				description: VERIFY_DESCRIPTION,
				detail: DETAIL.waitingForBuild,
				status: 'todo',
			};
		}
		if (task.status === 'failed' || task.status === 'cancelled') {
			return {
				id,
				description: VERIFY_DESCRIPTION,
				detail: DETAIL.buildIncomplete,
				status: 'cancelled',
			};
		}

		const outcome = parseWorkflowBuildOutcome(task.outcome);
		if (!outcome) {
			return {
				id,
				description: VERIFY_DESCRIPTION,
				detail: DETAIL.verificationPending,
				status: 'in_progress',
			};
		}

		const options = { source: 'planned', plannedTaskId: task.id } as const;
		const obligation =
			(await this.obligations.getObligation(threadId, outcome.workItemId, options)) ??
			deriveWorkflowVerificationObligationFromOutcome(threadId, outcome, options);
		return verifyRow(task.id, obligation);
	}

	/** Sync a direct builder's checklist rows from its background-task lifecycle. */
	async syncFromBackgroundTask(task: ManagedBackgroundTask): Promise<void> {
		if (task.plannedTaskId || task.parentCheckpointId || task.role !== 'workflow-builder') return;

		const items = await this.directItemsFromTask(task);
		if (!items) return;
		await this.upsertItems(task.threadId, task.runId, items);
	}

	private async directItemsFromTask(task: ManagedBackgroundTask): Promise<TaskItem[] | undefined> {
		const build = { id: task.taskId, description: BUILD_DESCRIPTION };
		const verify = { id: verifyRowId(task.taskId), description: VERIFY_DESCRIPTION };

		switch (task.status) {
			case 'running':
				return [
					{ ...build, detail: DETAIL.building, status: 'in_progress' },
					{ ...verify, detail: DETAIL.waitingForBuild, status: 'todo' },
				];
			case 'failed':
				return [
					{ ...build, detail: task.error ?? DETAIL.blocked, status: 'failed' },
					{ ...verify, detail: DETAIL.buildIncomplete, status: 'cancelled' },
				];
			case 'cancelled':
				return [
					{ ...build, detail: task.error ?? DETAIL.cancelled, status: 'cancelled' },
					{ ...verify, detail: DETAIL.buildIncomplete, status: 'cancelled' },
				];
			case 'completed':
				return await this.directItemsFromCompletedTask(task, build, verify);
		}
	}

	private async directItemsFromCompletedTask(
		task: ManagedBackgroundTask,
		build: { id: string; description: string },
		verify: { id: string; description: string },
	): Promise<TaskItem[] | undefined> {
		const outcome = parseWorkflowBuildOutcome(task.outcome);
		const workItemId = task.workItemId ?? outcome?.workItemId;
		if (!workItemId) {
			return [
				{ ...build, detail: DETAIL.submitted, status: 'done' },
				{ ...verify, detail: DETAIL.noWorkflow, status: 'cancelled' },
			];
		}

		const obligation = await this.obligations.getObligation(task.threadId, workItemId, {
			source: 'direct',
		});
		if (!obligation) return undefined;
		return directTaskItems(task.taskId, outcome, obligation);
	}

	/** Re-derive every direct builder's checklist rows from workflow-loop storage. */
	async syncFromWorkflowLoop(threadId: string, runId: string): Promise<void> {
		try {
			const taskStorage = new ThreadTaskStorage(this.agentMemory);
			const existing = await taskStorage.get(threadId);
			if (!existing?.tasks.length) return;

			const records = await new WorkflowLoopStorage(this.agentMemory).listWorkItems(threadId);
			const byBuildTaskId = new Map<
				string,
				{ outcome: WorkflowBuildOutcome | undefined; obligation: WorkflowVerificationObligation }
			>();
			for (const record of records) {
				if (this.obligations.isPlannedRecord(record)) continue;

				const obligation = this.obligations.obligationFromRecord(threadId, record, {
					source: 'direct',
				});
				if (obligation.taskId) {
					byBuildTaskId.set(obligation.taskId, { outcome: record.lastBuildOutcome, obligation });
				}
			}

			let tasks = existing.tasks;
			let changed = false;
			for (const task of existing.tasks) {
				const entry = byBuildTaskId.get(task.id);
				if (!entry) continue;

				const update = upsertTaskItemsInOrder(
					tasks,
					directTaskItems(task.id, entry.outcome, entry.obligation),
				);
				changed = changed || update.changed;
				tasks = update.tasks;
			}

			if (!changed) return;
			await this.saveAndPublish(taskStorage, threadId, runId, { tasks });
		} catch (error) {
			this.logger.warn('Failed to sync direct workflow builder task checklist items', {
				threadId,
				error: getErrorMessage(error),
			});
		}
	}

	private async upsertItems(threadId: string, runId: string, items: TaskItem[]): Promise<void> {
		try {
			const taskStorage = new ThreadTaskStorage(this.agentMemory);
			const existing = (await taskStorage.get(threadId)) ?? { tasks: [] };
			const { tasks, changed } = upsertTaskItemsInOrder(existing.tasks, items);
			if (!changed) return;
			await this.saveAndPublish(taskStorage, threadId, runId, { tasks });
		} catch (error) {
			this.logger.warn('Failed to update direct workflow builder task checklist items', {
				threadId,
				taskIds: items.map((item) => item.id),
				error: getErrorMessage(error),
			});
		}
	}

	private async saveAndPublish(
		taskStorage: ThreadTaskStorage,
		threadId: string,
		runId: string,
		taskList: TaskList,
	): Promise<void> {
		await taskStorage.save(threadId, taskList);
		this.eventBus.publish(threadId, {
			type: 'tasks-update',
			runId,
			agentId: ORCHESTRATOR_AGENT_ID,
			payload: { tasks: taskList },
		});
	}
}
