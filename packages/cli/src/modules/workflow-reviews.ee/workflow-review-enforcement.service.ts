import type {
	ProjectReviewPolicyView,
	ReviewRequirementPatch,
	WorkflowReviewPolicyView,
} from '@n8n/api-types';
import { ProjectRepository, WorkflowRepository, WorkflowReviewRequestRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@n8n/errors';

import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import {
	effectiveReviewRequirement,
	projectRequirementLockedBy,
	rejectsTurningRequirementOff,
	reviewRequirementLockedBy,
} from './workflow-review-enforcement.rule';

class ReviewRequirementLockedError extends BadRequestError {
	constructor() {
		super("This requirement is set by a higher scope and can't be turned off");
	}
}

/**
 * Resolves the publishing and promoting approval requirements across the
 * instance, the owning project, and the workflow. A higher scope can turn a
 * requirement on. A lower scope can add one. A lower scope cannot turn one off.
 */
@Service()
export class WorkflowReviewEnforcementService {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly policyService: WorkflowReviewPolicyService,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly requestRepository: WorkflowReviewRequestRepository,
	) {}

	async getProjectView(projectId: string): Promise<ProjectReviewPolicyView | null> {
		const [policy, project] = await Promise.all([
			this.policyService.get(),
			this.projectRepository.getReviewRequirements(projectId),
		]);
		if (!project) return null;

		return {
			publishingNeedsApproval: effectiveReviewRequirement({
				instance: policy.publishingNeedsApproval,
				project: project.publishingNeedsApproval,
				workflow: false,
			}),
			promotingNeedsApproval: effectiveReviewRequirement({
				instance: policy.promotingNeedsApproval,
				project: project.promotingNeedsApproval,
				workflow: false,
			}),
			publishingLockedBy: projectRequirementLockedBy(policy.publishingNeedsApproval),
			promotingLockedBy: projectRequirementLockedBy(policy.promotingNeedsApproval),
		};
	}

	async updateProject(
		projectId: string,
		patch: ReviewRequirementPatch,
	): Promise<ProjectReviewPolicyView> {
		const policy = await this.policyService.get();
		this.assertCanTurnOff(policy.publishingNeedsApproval, patch.publishingNeedsApproval);
		this.assertCanTurnOff(policy.promotingNeedsApproval, patch.promotingNeedsApproval);
		await this.projectRepository.setReviewRequirements(projectId, patch);
		const view = await this.getProjectView(projectId);
		if (!view) throw new BadRequestError('Project not found');
		return view;
	}

	async getWorkflowView(workflowId: string): Promise<WorkflowReviewPolicyView | null> {
		const [policy, rows] = await Promise.all([
			this.policyService.get(),
			this.workflowRepository.findReviewRequirementRows([workflowId]),
		]);
		const row = rows[0];
		if (!row) return null;
		return this.toWorkflowView(policy.publishingNeedsApproval, policy.promotingNeedsApproval, row);
	}

	async updateWorkflow(
		workflowId: string,
		patch: ReviewRequirementPatch,
	): Promise<WorkflowReviewPolicyView> {
		const [policy, rows] = await Promise.all([
			this.policyService.get(),
			this.workflowRepository.findReviewRequirementRows([workflowId]),
		]);
		const row = rows[0];
		if (!row) throw new BadRequestError('Workflow not found');

		this.assertCanTurnOff(
			policy.publishingNeedsApproval || row.projectPublishingNeedsApproval,
			patch.publishingNeedsApproval,
		);
		this.assertCanTurnOff(
			policy.promotingNeedsApproval || row.projectPromotingNeedsApproval,
			patch.promotingNeedsApproval,
		);
		await this.workflowRepository.setReviewRequirements(workflowId, patch);
		const view = await this.getWorkflowView(workflowId);
		if (!view) throw new BadRequestError('Workflow not found');
		return view;
	}

	/**
	 * Workflows that still need an approved review of their current version
	 * before they can be promoted. Empty when reviews are off.
	 * An instance requirement applies to every workflow in the set. Otherwise
	 * only a workflow whose project or own flag is on is gated.
	 */
	async workflowsMissingPromotionApproval(workflowIds: string[]): Promise<string[]> {
		if (!(await this.featureGate.isPromotionEnabled()) || workflowIds.length === 0) return [];

		const [policy, rows, approved] = await Promise.all([
			this.policyService.get(),
			this.workflowRepository.findReviewRequirementRows(workflowIds),
			this.requestRepository.findApprovedVersionKeys(workflowIds),
		]);

		const missing: string[] = [];
		for (const row of rows) {
			const required = effectiveReviewRequirement({
				instance: policy.promotingNeedsApproval,
				project: row.projectPromotingNeedsApproval,
				workflow: row.promotingNeedsApproval,
			});
			if (!required) continue;
			if (!approved.has(`${row.id}:${row.versionId}`)) missing.push(row.id);
		}
		return missing;
	}

	/**
	 * Resolves the workflow ids only when reviews are on, so a promote does not
	 * list every workflow while the feature is off.
	 */
	async assertCanPromoteWhenAvailable(resolveWorkflowIds: () => Promise<string[]>): Promise<void> {
		if (!(await this.featureGate.isPromotionEnabled())) return;
		await this.assertCanPromote(await resolveWorkflowIds());
	}

	async assertCanPromote(workflowIds: string[]): Promise<void> {
		if (!(await this.featureGate.isPromotionEnabled()) || workflowIds.length === 0) return;

		const openReviewIds = await this.requestRepository.findWorkflowIdsWithOpenReview(workflowIds);
		if (openReviewIds.size === 1) {
			throw new BadRequestError(
				"This workflow can't be promoted while its review is open. Submit this version to the review, or wait for the review to close.",
			);
		}
		if (openReviewIds.size > 1) {
			throw new BadRequestError(
				"Some workflows can't be promoted while a review is open. Submit those versions to the review, or wait for the reviews to close.",
			);
		}

		const missing = await this.workflowsMissingPromotionApproval(workflowIds);
		if (missing.length === 0) return;
		if (missing.length === 1) {
			throw new BadRequestError(
				'This workflow needs approval before it can be promoted. Submit it for review first.',
			);
		}
		throw new BadRequestError(
			'Some workflows need approval before they can be promoted. Submit them for review first.',
		);
	}

	async publishingRequired(workflowId: string): Promise<boolean> {
		if (!(await this.featureGate.isPublishingEnabled())) return false;
		const view = await this.getWorkflowView(workflowId);
		return view?.publishingNeedsApproval === true;
	}

	async hasApprovedReview(workflowId: string, versionId: string): Promise<boolean> {
		const approved = await this.requestRepository.findApprovedVersionKeys([workflowId]);
		return approved.has(`${workflowId}:${versionId}`);
	}

	private toWorkflowView(
		instancePublishing: boolean,
		instancePromoting: boolean,
		row: {
			publishingNeedsApproval: boolean;
			promotingNeedsApproval: boolean;
			projectPublishingNeedsApproval: boolean;
			projectPromotingNeedsApproval: boolean;
		},
	): WorkflowReviewPolicyView {
		return {
			publishingNeedsApproval: effectiveReviewRequirement({
				instance: instancePublishing,
				project: row.projectPublishingNeedsApproval,
				workflow: row.publishingNeedsApproval,
			}),
			promotingNeedsApproval: effectiveReviewRequirement({
				instance: instancePromoting,
				project: row.projectPromotingNeedsApproval,
				workflow: row.promotingNeedsApproval,
			}),
			publishingLockedBy: reviewRequirementLockedBy({
				instance: instancePublishing,
				project: row.projectPublishingNeedsApproval,
				workflow: false,
			}),
			promotingLockedBy: reviewRequirementLockedBy({
				instance: instancePromoting,
				project: row.projectPromotingNeedsApproval,
				workflow: false,
			}),
		};
	}

	private assertCanTurnOff(locked: boolean, requested: boolean | undefined): void {
		if (requested === undefined) return;
		if (rejectsTurningRequirementOff(locked, requested)) {
			throw new ReviewRequirementLockedError();
		}
	}
}
