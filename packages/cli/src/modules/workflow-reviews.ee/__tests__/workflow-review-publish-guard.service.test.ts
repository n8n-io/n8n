import type {
	SharedWorkflowRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import type { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewPublishGuard } from '../workflow-review-publish-guard.service';

describe('WorkflowReviewPublishGuard', () => {
	const featureGate = mock<WorkflowReviewFeatureGate>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const policyService = mock<WorkflowReviewPolicyService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const guard = new WorkflowReviewPublishGuard(
		featureGate,
		requestRepository,
		policyService,
		sharedWorkflowRepository,
	);
	const target = { versionId: 'version-1' };

	beforeEach(() => {
		vi.resetAllMocks();
		policyService.get.mockResolvedValue({ enabled: true });
	});

	test('does not query reviews when workflow reviews are unavailable', async () => {
		featureGate.isAvailable.mockResolvedValue(false);

		await expect(guard.assertCanPublish('workflow-1', target)).resolves.toBeUndefined();

		expect(requestRepository.findOpenRequestForWorkflow).not.toHaveBeenCalled();
	});

	test('allows publication when the workflow has no open review', async () => {
		featureGate.isAvailable.mockResolvedValue(true);
		requestRepository.findOpenRequestForWorkflow.mockResolvedValue(null);

		await expect(guard.assertCanPublish('workflow-1', target)).resolves.toBeUndefined();
	});

	test('blocks publication while a review is waiting for a decision', async () => {
		featureGate.isAvailable.mockResolvedValue(true);
		requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
			mock<WorkflowReviewRequest>({ id: 'review-1', decision: 'pending' }),
		);

		await expect(guard.assertCanPublish('workflow-1', target)).rejects.toMatchObject({
			httpStatusCode: 409,
			details: {
				reason: 'review_pending',
				workflowReviewRequestId: 'review-1',
			},
		});
	});

	test('explains when requested changes are blocking publication', async () => {
		featureGate.isAvailable.mockResolvedValue(true);
		requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
			mock<WorkflowReviewRequest>({ id: 'review-2', decision: 'changes_requested' }),
		);

		await expect(guard.assertCanPublish('workflow-1', target)).rejects.toMatchObject({
			httpStatusCode: 409,
			details: {
				reason: 'changes_requested',
				workflowReviewRequestId: 'review-2',
			},
		});
	});

	test('requires an approved review when the owning project of the workflow is unknown', async () => {
		featureGate.isAvailable.mockResolvedValue(true);
		requestRepository.findOpenRequestForWorkflow.mockResolvedValue(null);
		policyService.get.mockResolvedValue({ enabled: true, alwaysRequired: true });
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);
		requestRepository.hasApprovedReviewForVersion.mockResolvedValue(false);

		await expect(guard.assertCanPublish('workflow-1', target)).rejects.toMatchObject({
			httpStatusCode: 409,
			details: { reason: 'review_required', versionId: 'version-1' },
		});
	});

	test('treats an unfamiliar open-review decision as still waiting for review', async () => {
		featureGate.isAvailable.mockResolvedValue(true);
		requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
			mock<WorkflowReviewRequest>({
				id: 'review-3',
				decision: 'future_decision' as WorkflowReviewRequest['decision'],
			}),
		);

		await expect(guard.assertCanPublish('workflow-1', target)).rejects.toEqual(
			expect.objectContaining<Partial<WorkflowPublishBlockedError>>({
				details: {
					reason: 'review_pending',
					workflowReviewRequestId: 'review-3',
				},
			}),
		);
	});
});
