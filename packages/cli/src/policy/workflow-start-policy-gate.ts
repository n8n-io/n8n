import type { PolicedWorkflow } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { OwnershipService } from '@/services/ownership.service';

import { PolicyEnforcementService } from './policy-enforcement.service';

@Service()
export class WorkflowStartPolicyGate {
	constructor(
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly ownershipService: OwnershipService,
	) {}

	async enforce(
		workflow: PolicedWorkflow & { readonly id: string },
		executionId?: string,
	): Promise<void> {
		// The lookup below can fail, so skip it when no check would read it — a feature that is
		// merely absent must not fail executions. Asked per call, so load order can't hide one.
		if (!this.policyEnforcementService.hasChecksFor('workflowStart')) return;

		// Deliberately unguarded: an unevaluated project rule is not a passed one, so a failed
		// lookup fails the run. The other pre-execution gates let this throw too.
		const project = await this.ownershipService.getWorkflowProjectCached(workflow.id);

		await this.policyEnforcementService.enforceWorkflowStart(
			{ workflow, projectId: project.id },
			{ kind: 'system', reason: 'execution', executionId },
		);
	}
}
