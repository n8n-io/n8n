import { Logger } from '@n8n/backend-common';
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
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('policy');
	}

	@OnLifecycleEvent('workflowExecuteBefore')
	async onWorkflowExecuteBefore(ctx: WorkflowExecuteBeforeContext): Promise<void> {
		// Queue mode fires this on main after enqueueing, and the pre-flight-failure recorder
		// fires it for a run that already failed. Neither is about to execute anything: the
		// worker's own hook gates the queued run, and blocking a failure record would only
		// leave the execution half-written.
		if (!ctx.workflowInstance) return;

		await this.policyEnforcementService.enforceWorkflowStart({
			workflow: ctx.workflow,
			projectId: await this.resolveProjectId(ctx),
		});
	}

	/**
	 * `null` when the workflow has no owning project we can find — an unsaved workflow run
	 * from the editor, say. Instance-scoped checks still run; project-scoped ones are skipped
	 * rather than enforced, which is why this is logged rather than swallowed silently.
	 */
	private async resolveProjectId(ctx: WorkflowExecuteBeforeContext): Promise<string | null> {
		try {
			const project = await this.ownershipService.getWorkflowProjectCached(ctx.workflow.id);

			return project.id;
		} catch (error) {
			this.logger.warn('Could not resolve the project for a workflow start policy check', {
				workflowId: ctx.workflow.id,
				executionId: ctx.executionId,
				error,
			});

			return null;
		}
	}
}
