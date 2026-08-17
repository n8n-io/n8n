import { WorkflowPublishBlockedErrorPublicDto } from '../workflow-publish-blocked-error-public.dto';

describe('WorkflowPublishBlockedErrorPublicDto', () => {
	test('accepts a message-only conflict body (webhook path conflict)', () => {
		const result = WorkflowPublishBlockedErrorPublicDto.safeParse({
			message: 'Webhook path conflict',
		});

		expect(result.success).toBe(true);
	});

	test('accepts the review-blocked shape with reason and request id', () => {
		const result = WorkflowPublishBlockedErrorPublicDto.safeParse({
			message: "Workflow can't be published while its review is open.",
			reason: 'review_pending',
			workflowReviewRequestId: 'req-1',
		});

		expect(result.success).toBe(true);
	});

	test.each(['review_pending', 'changes_requested'])('accepts reason %s', (reason) => {
		const result = WorkflowPublishBlockedErrorPublicDto.safeParse({
			message: 'blocked',
			reason,
			workflowReviewRequestId: 'req-1',
		});

		expect(result.success).toBe(true);
	});

	test('rejects an invalid reason', () => {
		const result = WorkflowPublishBlockedErrorPublicDto.safeParse({
			message: 'blocked',
			reason: 'not-a-real-reason',
		});

		expect(result.success).toBe(false);
	});

	test('rejects a missing message', () => {
		const result = WorkflowPublishBlockedErrorPublicDto.safeParse({
			reason: 'review_pending',
			workflowReviewRequestId: 'req-1',
		});

		expect(result.success).toBe(false);
	});
});
