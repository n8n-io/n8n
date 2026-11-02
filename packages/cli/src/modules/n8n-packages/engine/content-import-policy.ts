import { Logger } from '@n8n/backend-common';
import type { ContentImportTransport } from '@n8n/decorators';
import { Service } from '@n8n/di';

import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

import type { WorkflowPlanItem } from '../entities/workflow/workflow-import.types';
import type { BlockingIssue, ImportPlanMode, PackageImportSource } from '../n8n-packages.types';
import { verdict } from './policy-verdict';

export function contentImportTransport(
	source: PackageImportSource | undefined,
): ContentImportTransport {
	return source === 'git-pull' ? 'git-connection' : 'package';
}

@Service()
export class ContentImportPolicyGate {
	constructor(
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly logger: Logger,
	) {}

	/**
	 * Admits every workflow the import would write, and reports the ones policy refused.
	 *
	 * A refusal takes down the whole package rather than skipping the workflow, unlike a
	 * source-control pull: the plan rewrites cross-workflow references to the ids each workflow
	 * *would* get, so dropping one leaves the workflows that call it pointing at a row nothing
	 * ever wrote.
	 *
	 * Reads the nodes off the plan, before credential bindings are applied — rebinding swaps
	 * credential ids, never node types or parameters, so it cannot change a verdict.
	 */
	async refusedWorkflows(
		items: WorkflowPlanItem[],
		projectId: string,
		transport: ContentImportTransport,
		actor: PolicyActor,
		mode: ImportPlanMode,
	): Promise<BlockingIssue[]> {
		// Skips the whole loop rather than paying a per-workflow guard: a package can hold
		// hundreds, and having no policy at all is the common case.
		if (!this.policyEnforcementService.hasChecksFor('contentImport')) return [];

		const refused: BlockingIssue[] = [];
		let checkFailed = false;

		for (const item of items) {
			if (item.action === 'skip') continue;

			const context = {
				workflow: {
					id: item.action === 'create' ? item.decidedId : item.existing.id,
					name: item.entity.name,
					nodes: item.entity.nodes,
				},
				projectId,
				transport,
			};

			// The clearance is discarded: these writes still go through `WorkflowCreationService`
			// and `WorkflowService`, which mint their own `workflowSave` one.
			const { violations, failed } = await verdict(
				mode,
				async () => await this.policyEnforcementService.enforceContentImport(context, actor),
				async () => await this.policyEnforcementService.evaluateContentImport(context),
			);
			checkFailed ||= failed;
			if (violations.length === 0) continue;

			if (mode === 'enforce') {
				this.logger.warn(`Workflow "${item.entity.name}" is blocked by the content-import policy`, {
					violations,
				});
			}
			// Every refusal is collected, so the caller reports the whole package at once.
			refused.push({
				type: 'policy-violation',
				sourceWorkflowId: item.sourceWorkflowId,
				name: item.entity.name,
				violations,
			});
		}

		if (checkFailed) refused.push({ type: 'policy-check-failed', point: 'contentImport' });
		return refused;
	}
}
