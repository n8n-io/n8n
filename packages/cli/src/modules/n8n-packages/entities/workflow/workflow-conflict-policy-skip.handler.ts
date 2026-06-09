import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import { WorkflowConflictPolicyHandler } from './workflow-conflict-policy-handler';
import type { WorkflowImportOutcome, WorkflowMatchContext } from './workflow-conflict-policy.types';

@Service()
export class WorkflowConflictPolicySkipHandler extends WorkflowConflictPolicyHandler {
	constructor(workflowCreationService: WorkflowCreationService) {
		super(workflowCreationService);
	}

	preFlight(): void {}

	async handle(
		entity: WorkflowEntity,
		sourceWorkflowId: string,
		match: WorkflowEntity | null,
		context: WorkflowMatchContext,
	): Promise<WorkflowImportOutcome> {
		if (match) {
			return { status: 'skipped', workflow: match, sourceWorkflowId };
		}

		return await this.createWorkflow(entity, sourceWorkflowId, context);
	}
}
