import { WorkflowPublishBlockedErrorPublicDto } from '../workflow-publish-blocked-error-public.dto';

describe('WorkflowPublishBlockedErrorPublicDto', () => {
	// A webhook path conflict sends the same 409 with a message and nothing else.
	test('accepts a message-only body', () => {
		const result = WorkflowPublishBlockedErrorPublicDto.safeParse({
			message: 'Webhook path conflict',
		});

		expect(result.success).toBe(true);
	});

	test.each(['review_pending', 'changes_requested'])(
		'accepts the review-blocked shape with reason %s',
		(reason) => {
			const result = WorkflowPublishBlockedErrorPublicDto.safeParse({
				message: "Workflow can't be published while its review is open.",
				reason,
				workflowReviewRequestId: 'req-1',
			});

			expect(result.success).toBe(true);
		},
	);

	test('rejects a missing message', () => {
		const result = WorkflowPublishBlockedErrorPublicDto.safeParse({
			reason: 'review_pending',
			workflowReviewRequestId: 'req-1',
		});

		expect(result.success).toBe(false);
	});
});
