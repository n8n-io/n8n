import type { WorkflowEntity } from '@n8n/db';

import type { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import type {
	WorkflowConflict,
	WorkflowImportOutcome,
	WorkflowMatchContext,
} from './workflow-conflict-policy.types';

export abstract class WorkflowConflictPolicyHandler {
	constructor(protected readonly workflowCreationService: WorkflowCreationService) {}

	abstract preFlight(conflicts: WorkflowConflict[]): void;

	abstract handle(
		entity: WorkflowEntity,
		sourceWorkflowId: string,
		match: WorkflowEntity | null,
		context: WorkflowMatchContext,
	): Promise<WorkflowImportOutcome>;

	protected async createWorkflow(
		entity: WorkflowEntity,
		sourceWorkflowId: string,
		context: WorkflowMatchContext,
	): Promise<WorkflowImportOutcome> {
		const workflow = await this.workflowCreationService.createWorkflow(context.user, entity, {
			projectId: context.projectId,
			parentFolderId: context.folderId ?? undefined,
			publicApi: true,
			source: 'import',
			sourceWorkflowId,
		});

		return { status: 'created', workflow, sourceWorkflowId };
	}
}
