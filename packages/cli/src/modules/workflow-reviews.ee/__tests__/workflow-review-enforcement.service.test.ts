import type {
	ProjectRepository,
	WorkflowRepository,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import { WorkflowReviewEnforcementService } from '../workflow-review-enforcement.service';
import type { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';

const policy = {
	enabled: true,
	publishingNeedsApproval: false,
	promotionReviewsEnabled: true,
	promotingNeedsApproval: false,
};

describe('WorkflowReviewEnforcementService', () => {
	const featureGate = mock<WorkflowReviewFeatureGate>();
	const policyService = mock<WorkflowReviewPolicyService>();
	const projectRepository = mock<ProjectRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const service = new WorkflowReviewEnforcementService(
		featureGate,
		policyService,
		projectRepository,
		workflowRepository,
		requestRepository,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		featureGate.isPromotionEnabled.mockResolvedValue(true);
		featureGate.isPublishingEnabled.mockResolvedValue(true);
		policyService.get.mockResolvedValue({ ...policy });
		projectRepository.getReviewRequirements.mockResolvedValue({
			publishingNeedsApproval: false,
			promotingNeedsApproval: false,
		});
	});

	test('rejects turning off a requirement the instance already set', async () => {
		policyService.get.mockResolvedValue({ ...policy, publishingNeedsApproval: true });

		await expect(
			service.updateProject('project-1', { publishingNeedsApproval: false }),
		).rejects.toThrow("This requirement is set by a higher scope and can't be turned off");
		expect(projectRepository.setReviewRequirements).not.toHaveBeenCalled();
	});

	test('lets a project add a requirement the instance has not set', async () => {
		projectRepository.getReviewRequirements.mockResolvedValue({
			publishingNeedsApproval: true,
			promotingNeedsApproval: false,
		});

		await service.updateProject('project-1', { publishingNeedsApproval: true });

		expect(projectRepository.setReviewRequirements).toHaveBeenCalledWith('project-1', {
			publishingNeedsApproval: true,
		});
	});

	test('lets a project turn off its own requirement when the instance has not set it', async () => {
		await service.updateProject('project-1', { publishingNeedsApproval: false });

		expect(projectRepository.setReviewRequirements).toHaveBeenCalledWith('project-1', {
			publishingNeedsApproval: false,
		});
	});

	test('does not enforce promotion approval while promotion reviews are off', async () => {
		featureGate.isPromotionEnabled.mockResolvedValue(false);

		await expect(service.assertCanPromote(['workflow-1'])).resolves.toBeUndefined();

		expect(workflowRepository.findReviewRequirementRows).not.toHaveBeenCalled();
	});

	test('rejects promotion when the workflow has no approved review for its version', async () => {
		workflowRepository.findReviewRequirementRows.mockResolvedValue([
			{
				id: 'workflow-1',
				versionId: 'version-1',
				projectId: 'project-1',
				publishingNeedsApproval: false,
				promotingNeedsApproval: true,
				projectPublishingNeedsApproval: false,
				projectPromotingNeedsApproval: false,
			},
		]);
		requestRepository.findWorkflowIdsWithOpenReview.mockResolvedValue(new Set());
		requestRepository.findApprovedVersionKeys.mockResolvedValue(new Set());

		await expect(service.assertCanPromote(['workflow-1'])).rejects.toThrow(
			/needs approval before it can be promoted/,
		);
	});
});
