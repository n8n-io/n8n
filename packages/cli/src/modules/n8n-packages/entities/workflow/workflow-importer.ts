import { Service } from '@n8n/di';

import type { PackageImportBindings, WorkflowConflictPolicy } from '../../n8n-packages.types';
import { WorkflowImportMatchService } from './workflow-import-match.service';
import { WorkflowConflictPolicyFactory } from './workflow-conflict-policy.factory';
import type {
	PreparedWorkflow,
	WorkflowConflict,
	WorkflowImportOutcome,
	WorkflowMatchContext,
} from './workflow-conflict-policy.types';

export interface WorkflowImportResult {
	outcomes: WorkflowImportOutcome[];
	bindings: PackageImportBindings;
}

/**
 * Coordinates importing a batch of prepared workflows under a given conflict
 * policy: selects the policy handler, matches each workflow against existing
 * ones in the destination project, runs the policy pre-flight check, then
 * dispatches each workflow to the handler.
 */
@Service()
export class WorkflowImporter {
	constructor(
		private readonly workflowConflictPolicyFactory: WorkflowConflictPolicyFactory,
		private readonly workflowImportMatchService: WorkflowImportMatchService,
	) {}

	async importWorkflows(
		prepared: PreparedWorkflow[],
		policy: WorkflowConflictPolicy,
		context: WorkflowMatchContext,
		bindings: PackageImportBindings,
	): Promise<WorkflowImportResult> {
		const workflowConflictPolicyHandler = this.workflowConflictPolicyFactory.getHandler(policy);

		const matchBySourceWorkflowId = await this.workflowImportMatchService.findBySourceWorkflowIds(
			context.projectId,
			prepared.map(({ sourceWorkflowId }) => sourceWorkflowId),
		);

		const conflicts: WorkflowConflict[] = Array.from(matchBySourceWorkflowId.entries()).map(
			([sourceWorkflowId, match]) => ({
				sourceWorkflowId,
				existingWorkflowId: match.id,
				name: match.name,
			}),
		);
		workflowConflictPolicyHandler.preFlight(conflicts);

		const outcomes: WorkflowImportOutcome[] = [];
		const workflowBindings = new Map(bindings.workflows);
		for (const { entity, sourceWorkflowId } of prepared) {
			const match = matchBySourceWorkflowId.get(sourceWorkflowId) ?? null;
			const outcome = await workflowConflictPolicyHandler.handle(
				entity,
				sourceWorkflowId,
				match,
				context,
			);
			outcomes.push(outcome);
			// Works for every status: created/updated/skipped all resolve to a real target id.
			workflowBindings.set(sourceWorkflowId, outcome.workflow.id);
		}

		return { outcomes, bindings: { ...bindings, workflows: workflowBindings } };
	}
}
