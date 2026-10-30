import type { PolicyViolation, SubWorkflowPolicyCheckResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowPublishedDataService } from '@n8n/backend-services';
import { WorkflowsConfig } from '@n8n/config';
import { type Project, type User, type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InternalServerError } from '@n8n/errors';
import type { INode } from 'n8n-workflow';

import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

/**
 * Previews the `workflowStart` refusal a sub-execution would hit, so the parent's builder learns
 * about it before a run. Mirrors the execution path: the sub-workflow is judged against its own
 * home project, as `PolicyLifecycleHandler` does.
 */
@Service()
export class SubWorkflowPolicyCheckService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
		private readonly ownershipService: OwnershipService,
		private readonly projectService: ProjectService,
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
		private readonly policyEnforcementService: PolicyEnforcementService,
	) {}

	/**
	 * Returns `null` when the sub-workflow does not exist or the parent may not call it. A run
	 * would then stop before the policy check, so the policy must not be disclosed either.
	 */
	async check(
		user: User,
		parentWorkflowId: string,
		subWorkflowId: string,
	): Promise<SubWorkflowPolicyCheckResponse | null> {
		const subWorkflow = await this.workflowRepository.findOne({
			where: { id: subWorkflowId },
			relations: this.workflowsConfig.useWorkflowPublicationService ? [] : ['activeVersion'],
		});
		if (!subWorkflow) return null;

		if (!(await this.subworkflowPolicyChecker.isCallAllowed(subWorkflow, parentWorkflowId))) {
			return null;
		}

		const project = await this.ownershipService.getWorkflowProjectCached(subWorkflow.id);
		const publishedNodes = await this.findPublishedNodes(subWorkflow);

		const [draft, published, projectName] = await Promise.all([
			this.evaluate(subWorkflow, subWorkflow.nodes, project.id),
			publishedNodes ? this.evaluate(subWorkflow, publishedNodes, project.id) : null,
			this.visibleProjectName(user, project),
		]);

		return { ...(projectName !== null && { projectName }), draft, published };
	}

	/**
	 * Personal project names hold user names and emails, and a caller may reach a sub-workflow
	 * through its caller policy alone, so only a team project the user can read is named.
	 */
	private async visibleProjectName(user: User, project: Project): Promise<string | null> {
		if (project.type !== 'team') return null;

		const readable = await this.projectService.getProjectWithScope(user, project.id, [
			'project:read',
		]);

		return readable ? project.name : null;
	}

	/** Same source as `getPublishedWorkflowData`, which production sub-executions run. */
	private async findPublishedNodes(workflow: WorkflowEntity): Promise<INode[] | null> {
		if (this.workflowsConfig.useWorkflowPublicationService) {
			const published = await this.workflowPublishedDataService.getPublishedWorkflowData(
				workflow.id,
			);
			return published?.publishedVersion.nodes ?? null;
		}

		return workflow.activeVersion?.nodes ?? null;
	}

	/**
	 * A check that failed to run refuses the real start, so it must not read as "no
	 * violations" here.
	 */
	private async evaluate(
		workflow: WorkflowEntity,
		nodes: INode[],
		projectId: string,
	): Promise<PolicyViolation[]> {
		const decision = await this.policyEnforcementService.evaluateWorkflowStart({
			workflow: { id: workflow.id, name: workflow.name, nodes },
			projectId,
		});

		if (decision.checkErrors?.length) {
			this.logger.warn('A policy check failed while previewing a sub-workflow start', {
				workflowId: workflow.id,
				checkErrors: decision.checkErrors,
			});
			throw new InternalServerError('A policy check failed to run');
		}

		return decision.violations;
	}
}
