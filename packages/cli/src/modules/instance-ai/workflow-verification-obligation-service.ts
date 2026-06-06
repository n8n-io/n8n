import {
	deriveWorkflowVerificationObligation,
	deriveWorkflowVerificationObligationFromOutcome,
	isPlannedWorkflowBuildOwner,
	isWorkflowVerificationObligationUnsettled,
	resolveWorkflowBuildOwner,
	WorkflowLoopStorage,
	workflowBuildOutcomeSchema,
	type PlannedTaskGraph,
	type PlannedWorkflowVerification,
	type WorkflowBuildOutcome,
	type WorkflowLoopWorkItemRecord,
	type WorkflowVerificationObligation,
	type WorkflowVerificationObligationSource,
} from '@n8n/instance-ai';

import type { TypeORMAgentMemory } from './storage/typeorm-agent-memory';

export function parseWorkflowBuildOutcome(
	outcome: Record<string, unknown> | undefined,
): WorkflowBuildOutcome | undefined {
	const parsed = workflowBuildOutcomeSchema.safeParse(outcome);
	return parsed.success ? parsed.data : undefined;
}

export class WorkflowVerificationObligationService {
	constructor(private readonly agentMemory: TypeORMAgentMemory) {}

	private storage(): WorkflowLoopStorage {
		return new WorkflowLoopStorage(this.agentMemory);
	}

	isPlannedRecord(record: WorkflowLoopWorkItemRecord): boolean {
		return isPlannedWorkflowBuildOwner(
			resolveWorkflowBuildOwner(record.state, record.lastBuildOutcome),
		);
	}

	async getObligation(
		threadId: string,
		workItemId: string,
		options: { source: WorkflowVerificationObligationSource; plannedTaskId?: string },
	): Promise<WorkflowVerificationObligation | undefined> {
		const record = await this.storage().getWorkItem(threadId, workItemId);
		if (!record) return undefined;
		return this.obligationFromRecord(threadId, record, options);
	}

	obligationFromRecord(
		threadId: string,
		record: WorkflowLoopWorkItemRecord,
		options: { source: WorkflowVerificationObligationSource; plannedTaskId?: string },
	): WorkflowVerificationObligation {
		return deriveWorkflowVerificationObligation(threadId, record, options);
	}

	async findPendingPlannedWorkflowVerification(
		threadId: string,
		graph: PlannedTaskGraph,
	): Promise<PlannedWorkflowVerification | undefined> {
		for (const task of graph.tasks) {
			if (task.kind !== 'build-workflow' || task.status !== 'succeeded') continue;

			const verification = await this.pendingPlannedWorkflowVerificationFromTask(threadId, task);
			if (verification) return verification;
		}

		return undefined;
	}

	async revalidatePlannedWorkflowVerification(
		threadId: string,
		verification: PlannedWorkflowVerification,
	): Promise<PlannedWorkflowVerification | undefined> {
		return await this.pendingPlannedWorkflowVerificationFromTask(
			threadId,
			verification.task,
			verification.outcome,
		);
	}

	private async pendingPlannedWorkflowVerificationFromTask(
		threadId: string,
		task: PlannedTaskGraph['tasks'][number],
		fallbackOutcome?: WorkflowBuildOutcome,
	): Promise<PlannedWorkflowVerification | undefined> {
		const taskOutcome = parseWorkflowBuildOutcome(task.outcome);
		const baseOutcome = taskOutcome ?? fallbackOutcome;
		if (!baseOutcome) return undefined;

		const options = { source: 'planned', plannedTaskId: task.id } as const;
		const record = await this.storage().getWorkItem(threadId, baseOutcome.workItemId);
		const outcome = record?.lastBuildOutcome ?? baseOutcome;
		const obligation = record?.lastBuildOutcome
			? this.obligationFromRecord(threadId, record, options)
			: deriveWorkflowVerificationObligationFromOutcome(threadId, outcome, options);

		if (!isWorkflowVerificationObligationUnsettled(obligation)) return undefined;

		return { task, obligation, outcome };
	}
}
