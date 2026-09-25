import {
	deriveWorkflowVerificationObligation,
	isPlannedWorkflowBuildOwner,
	resolveWorkflowBuildOwner,
	WorkflowLoopStorage,
	workflowBuildOutcomeSchema,
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
	constructor(
		private readonly agentMemory: TypeORMAgentMemory,
		private readonly isSetupPanelEnabled: (threadId: string) => boolean = () => false,
	) {}

	private storage(): WorkflowLoopStorage {
		return new WorkflowLoopStorage(this.agentMemory);
	}

	/** Records from builds of the removed planned-task flow. They are never verified again. */
	isPlannedRecord(record: WorkflowLoopWorkItemRecord): boolean {
		return isPlannedWorkflowBuildOwner(
			resolveWorkflowBuildOwner(record.state, record.lastBuildOutcome),
		);
	}

	async getObligation(
		threadId: string,
		workItemId: string,
		options: { source: WorkflowVerificationObligationSource },
	): Promise<WorkflowVerificationObligation | undefined> {
		const record = await this.storage().getWorkItem(threadId, workItemId);
		if (!record) return undefined;
		return this.obligationFromRecord(threadId, record, options);
	}

	obligationFromRecord(
		threadId: string,
		record: WorkflowLoopWorkItemRecord,
		options: { source: WorkflowVerificationObligationSource },
	): WorkflowVerificationObligation {
		return deriveWorkflowVerificationObligation(threadId, record, {
			...options,
			setupPanelEnabled: this.isSetupPanelEnabled(threadId),
		});
	}
}
