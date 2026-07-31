import type { WorkflowReviewRequest, WorkflowReviewRequestRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';

import type { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewPublishGuard } from '../workflow-review-publish-guard.service';

describe('WorkflowReviewPublishGuard', () => {
	const featureGate = mock<WorkflowReviewFeatureGate>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const guard = new WorkflowReviewPublishGuard(featureGate, requestRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('does not query reviews when workflow reviews are unavailable', async () => {
		featureGate.isAvailable.mockResolvedValue(false);

		await expect(guard.assertCanPublish('workflow-1')).resolves.toBeUndefined();

		expect(requestRepository.findOpenRequestForWorkflow).not.toHaveBeenCalled();
	});

	test('allows publication when the workflow has no open review', async () => {
		featureGate.isAvailable.mockResolvedValue(true);
		requestRepository.findOpenRequestForWorkflow.mockResolvedValue(null);

		await expect(guard.assertCanPublish('workflow-1')).resolves.toBeUndefined();
	});

	test('blocks publication while a review is waiting for a decision', async () => {
		featureGate.isAvailable.mockResolvedValue(true);
		requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
			mock<WorkflowReviewRequest>({ id: 'review-1', decision: 'pending' }),
		);

		await expect(guard.assertCanPublish('workflow-1')).rejects.toMatchObject({
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

		await expect(guard.assertCanPublish('workflow-1')).rejects.toMatchObject({
			httpStatusCode: 409,
			details: {
				reason: 'changes_requested',
				workflowReviewRequestId: 'review-2',
			},
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

		await expect(guard.assertCanPublish('workflow-1')).rejects.toEqual(
			expect.objectContaining<Partial<WorkflowPublishBlockedError>>({
				details: {
					reason: 'review_pending',
					workflowReviewRequestId: 'review-3',
				},
			}),
		);
	});
});
