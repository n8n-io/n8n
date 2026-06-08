import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowConflictPolicyHandler } from './workflow-conflict-policy-handler';
import type { WorkflowImportOutcome, WorkflowMatchContext } from './workflow-conflict-policy.types';

@Service()
export class WorkflowConflictPolicyNewVersionHandler extends WorkflowConflictPolicyHandler {
	constructor(
		workflowCreationService: WorkflowCreationService,
		private readonly workflowService: WorkflowService,
	) {
		super(workflowCreationService);
	}

	preFlight(): void {}

	async handle(
		entity: WorkflowEntity,
		sourceWorkflowId: string,
		match: WorkflowEntity | null,
		context: WorkflowMatchContext,
	): Promise<WorkflowImportOutcome> {
		if (!match) {
			return await this.createWorkflow(entity, sourceWorkflowId, context);
		}

		const workflow = await this.workflowService.update(context.user, entity, match.id, {
			publicApi: true,
			publishIfActive: true,
			source: 'import',
		});
		workflow.parentFolder = match.parentFolder;

		return { status: 'updated', workflow, sourceWorkflowId };
	}
}
