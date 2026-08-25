import { OnLifecycleEvent } from '@n8n/decorators';
import type { WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { OwnershipService } from '@/services/ownership.service';

/**
 * The execution backstop: every run passes through `workflowExecuteBefore`, so one
 * registration here covers all four hook-assembly variants — regular main, queue-mode
 * worker, sub-execution and manual — through `ModulesHooksRegistry`.
 *
 * A violation throws, and nothing between here and the engine catches it, so the run is
 * aborted and stored as `error`.
 */
@Service()
export class PolicyLifecycleHandler {
	constructor(
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly ownershipService: OwnershipService,
	) {}

	@OnLifecycleEvent('workflowExecuteBefore')
	async onWorkflowExecuteBefore(ctx: WorkflowExecuteBeforeContext): Promise<void> {
		// Queue mode fires this on main after enqueueing, and the pre-flight-failure recorder
		// fires it for a run that already failed. Neither is about to execute anything: the
		// worker's own hook gates the queued run, and blocking a failure record would only
		// leave the execution half-written.
		if (!ctx.workflowInstance) return;

		// Nothing to decide means nothing worth a database lookup, and that lookup can fail —
		// without this, a feature that is merely absent could fail an execution. Asked of the
		// enforcement layer rather than worked out here, so a check registered only for another
		// point cannot be mistaken for one that guards this one. Asked per invocation, so module
		// load order can't decide whether a check runs.
		if (!this.policyEnforcementService.hasChecksFor('workflowStart')) return;

		// Deliberately unguarded. Not knowing which project owns the workflow means
		// project-scoped rules cannot be evaluated, and an unevaluated rule is not a passed
		// one — so the run fails instead of proceeding under an assumed policy. This matches
		// the other pre-execution gates (`credentials-permission-checker`,
		// `subworkflow-policy-checker`), which also let this lookup throw.
		const project = await this.ownershipService.getWorkflowProjectCached(ctx.workflow.id);

		await this.policyEnforcementService.enforceWorkflowStart({
			workflow: ctx.workflow,
			projectId: project.id,
		});
	}
}
