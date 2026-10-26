import {
	deriveWorkflowVerificationObligation,
	WorkflowLoopStorage,
	workflowBuildOutcomeSchema,
	type WorkflowBuildOutcome,
	type WorkflowLoopWorkItemRecord,
	type WorkflowVerificationObligation,
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

	async getObligation(
		threadId: string,
		workItemId: string,
	): Promise<WorkflowVerificationObligation | undefined> {
		const record = await this.storage().getWorkItem(threadId, workItemId);
		if (!record) return undefined;
		return this.obligationFromRecord(threadId, record);
	}

	obligationFromRecord(
		threadId: string,
		record: WorkflowLoopWorkItemRecord,
	): WorkflowVerificationObligation {
		return deriveWorkflowVerificationObligation(threadId, record, {
			setupPanelEnabled: this.isSetupPanelEnabled(threadId),
		});
	}
}
