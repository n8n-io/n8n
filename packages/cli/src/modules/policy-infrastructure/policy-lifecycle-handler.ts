import { OnLifecycleEvent } from '@n8n/decorators';
import type { WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { OwnershipService } from '@/services/ownership.service';

/**
 * The execution backstop. Every way an execution starts — main, queue worker,
 * sub-execution, manual — runs `workflowExecuteBefore`, so one registration covers them all.
 *
 * Nothing catches a violation's throw before the engine, so the run is aborted and stored
 * as `error`.
 */
@Service()
export class PolicyLifecycleHandler {
	constructor(
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly ownershipService: OwnershipService,
	) {}

	@OnLifecycleEvent('workflowExecuteBefore')
	async onWorkflowExecuteBefore(ctx: WorkflowExecuteBeforeContext): Promise<void> {
		// Nothing is about to run: queue mode also fires this on main once the job is enqueued,
		// where the worker's own hook gates it, and the failure recorder fires it for a dead run.
		if (!ctx.workflowInstance) return;

		// The lookup below can fail, so skip it when no check would read it — a feature that is
		// merely absent must not fail executions. Asked per call, so load order can't hide one.
		if (!this.policyEnforcementService.hasChecksFor('workflowStart')) return;

		// Deliberately unguarded: an unevaluated project rule is not a passed one, so a failed
		// lookup fails the run. The other pre-execution gates let this throw too.
		const project = await this.ownershipService.getWorkflowProjectCached(ctx.workflow.id);

		await this.policyEnforcementService.enforceWorkflowStart({
			workflow: ctx.workflow,
			projectId: project.id,
		});
	}
}
