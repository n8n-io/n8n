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
		const record = await new WorkflowLoopStorage(this.agentMemory).getWorkItem(
			threadId,
			workItemId,
		);
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

			const outcome = parseWorkflowBuildOutcome(task.outcome);
			if (!outcome) continue;

			const options = { source: 'planned', plannedTaskId: task.id } as const;
			const obligation =
				(await this.getObligation(threadId, outcome.workItemId, options)) ??
				deriveWorkflowVerificationObligationFromOutcome(threadId, outcome, options);
			if (!isWorkflowVerificationObligationUnsettled(obligation)) continue;

			return { task, obligation, outcome };
		}

		return undefined;
	}
}
