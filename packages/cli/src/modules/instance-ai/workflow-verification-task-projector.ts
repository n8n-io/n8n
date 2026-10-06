import type { TaskList } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	deriveWorkflowVerificationObligationFromOutcome,
	orchestratorAgentId,
	ThreadTaskStorage,
	WorkflowLoopStorage,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type WorkflowBuildOutcome,
	type WorkflowVerificationObligation,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { AssistantEventSink } from './event-bus/assistant-event-sink';

import {
	parseWorkflowBuildOutcome,
	type WorkflowVerificationObligationService,
} from './workflow-verification-obligation-service';

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
	verificationOptional: 'Verification optional - one-off run',
	noWorkflow: 'No workflow to verify',
	submitted: 'Submitted',
	blocked: 'Blocked',
	cancelled: 'Cancelled',
} as const;

type TaskItem = TaskList['tasks'][number];
type TaskStatus = TaskItem['status'];

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
			// A one-off build settles as not_verifiable by design — verification is
			// a choice there, not a failure. But evidence outranks the label: if a
			// pre-flight verify actually ran and did not fully succeed, surface
			// that instead of the benign one-off wording.
			return obligation.executionIntent === 'one-off' && obligation.evidence?.attempted !== true
				? DETAIL.verificationOptional
				: DETAIL.couldNotVerify;
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
		private readonly agentMemory: ConstructorParameters<typeof WorkflowLoopStorage>[0],
		private readonly eventBus: AssistantEventSink,
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
			agentId: orchestratorAgentId(runId),
			payload: { tasks: taskList },
		});
	}
}
