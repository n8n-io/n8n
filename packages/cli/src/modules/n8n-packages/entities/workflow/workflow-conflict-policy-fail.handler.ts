import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import { WorkflowConflictPolicyHandler } from './workflow-conflict-policy-handler';
import type {
	WorkflowConflict,
	WorkflowImportOutcome,
	WorkflowMatchContext,
} from './workflow-conflict-policy.types';

@Service()
export class WorkflowConflictPolicyFailHandler extends WorkflowConflictPolicyHandler {
	constructor(workflowCreationService: WorkflowCreationService) {
		super(workflowCreationService);
	}

	preFlight(conflicts: WorkflowConflict[]): void {
		if (conflicts.length === 0) return;

		const names = conflicts.map(({ name }) => `"${name}"`).join(', ');
		const message =
			`Import blocked: ${conflicts.length} workflow(s) already exist in the target project ` +
			`(${names}). workflowConflictPolicy was set to "fail" to prevent overwriting existing workflows.`;

		throw new ConflictError(message, undefined, {
			code: 'WORKFLOW_CONFLICT',
			conflicts,
		});
	}

	async handle(
		entity: WorkflowEntity,
		sourceWorkflowId: string,
		_match: WorkflowEntity | null,
		context: WorkflowMatchContext,
	): Promise<WorkflowImportOutcome> {
		return await this.createWorkflow(entity, sourceWorkflowId, context);
	}
}
