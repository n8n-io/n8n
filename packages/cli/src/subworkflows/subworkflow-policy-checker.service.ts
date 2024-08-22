import { Service } from 'typedi';
import { GlobalConfig } from '@n8n/config';
import { Logger } from '@/logger';
import { License } from '@/license';
import { OwnershipService } from '@/services/ownership.service';
import type { Workflow, INode, WorkflowSettings } from 'n8n-workflow';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';

type Policy = WorkflowSettings.CallerPolicy;
type DenialPolicy = Exclude<Policy, 'any'>;

@Service()
export class SubworkflowPolicyChecker {
	constructor(
		private readonly logger: Logger,
		private readonly license: License,
		private readonly ownershipService: OwnershipService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Check whether the parent workflow is allowed to call the subworkflow.
	 */
	async check(subworkflow: Workflow, parentWorkflowId: string, node?: INode) {
		const { id: subworkflowId } = subworkflow;

		if (!subworkflowId) return; // e.g. when running a subworkflow loaded from a file

		const policy = this.findPolicy(subworkflow);

		if (policy === 'any') return;

		const { parentWorkflowProject, subworkflowProject } = await this.findProjects({
			parentWorkflowId,
			subworkflowId,
		});

		const areOwnedBySameProject = parentWorkflowProject.id === subworkflowProject.id;

		if (
			policy === 'none' ||
			(policy === 'workflowsFromAList' && !this.hasParentListed(subworkflow, parentWorkflowId)) ||
			(policy === 'workflowsFromSameOwner' && !areOwnedBySameProject)
		) {
			this.logDenial({ parentWorkflowId, subworkflowId, policy });

			throw new SubworkflowPolicyDenialError({
				subworkflowId,
				subworkflowProject,
				areOwnedBySameProject,
				node,
			});
		}
	}

	/**
	 * Find the subworkflow's caller policy.
	 */
	private findPolicy(subworkflow: Workflow): WorkflowSettings.CallerPolicy {
		if (!this.license.isSharingEnabled()) return 'workflowsFromSameOwner';

		return (
			subworkflow.settings?.callerPolicy ?? this.globalConfig.workflows.callerPolicyDefaultOption
		);
	}

	/**
	 * Find the projects that own the parent workflow and the subworkflow.
	 */
	private async findProjects({
		parentWorkflowId,
		subworkflowId,
	}: {
		parentWorkflowId: string;
		subworkflowId: string;
	}) {
		const [parentWorkflowProject, subworkflowProject] = await Promise.all([
			this.ownershipService.getWorkflowProjectCached(parentWorkflowId),
			this.ownershipService.getWorkflowProjectCached(subworkflowId),
		]);

		return { parentWorkflowProject, subworkflowProject };
	}

	/**
	 * Whether the subworkflow has the parent workflow listed as a caller.
	 */
	private hasParentListed(subworkflow: Workflow, parentWorkflowId: string) {
		const callerIds =
			subworkflow.settings.callerIds
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id !== '') ?? [];

		return callerIds.includes(parentWorkflowId);
	}

	private readonly denialReasons: Record<DenialPolicy, string> = {
		none: 'Subworkflow may not be called by any workflow',
		workflowsFromAList: 'Subworkflow may be called only by workflows from an allowlist',
		workflowsFromSameOwner: 'Subworkflow may be called only by workflows owned by the same project',
	};

	private logDenial({
		parentWorkflowId,
		subworkflowId,
		policy,
	}: {
		parentWorkflowId: string;
		subworkflowId: string;
		policy: DenialPolicy;
	}) {
		this.logger.warn('[SubworkflowPolicyChecker] Subworkflow execution denied', {
			reason: this.denialReasons[policy],
			parentWorkflowId,
			subworkflowId,
			isSharingEnabled: this.license.isSharingEnabled(),
		});
	}
}
