import { SourceControlledFileSchema } from '../schemas/source-controlled-file.schema';
import {
	isWorkflowPublishBlockedDetails,
	workflowPublishBlockedDetailsSchema,
} from '../workflow-publish-blocked-details';

describe('workflow publication blocker details', () => {
	test.each(['review_pending', 'changes_requested'] as const)(
		'accepts the "%s" reason with a review request ID',
		(reason) => {
			const details = {
				reason,
				workflowReviewRequestId: 'review-1',
			};

			expect(workflowPublishBlockedDetailsSchema.parse(details)).toEqual(details);
			expect(isWorkflowPublishBlockedDetails(details)).toBe(true);
		},
	);

	test.each(['review_pending', 'changes_requested'] as const)(
		'rejects the "%s" reason without a review request ID',
		(reason) => {
			const details = { reason };

			expect(workflowPublishBlockedDetailsSchema.safeParse(details).success).toBe(false);
			expect(isWorkflowPublishBlockedDetails(details)).toBe(false);
		},
	);

	test.each(['insufficient_api_key_scope', 'insufficient_permissions'] as const)(
		'accepts the "%s" reason on its own, and with the saved version',
		(reason) => {
			expect(isWorkflowPublishBlockedDetails({ reason })).toBe(true);
			expect(isWorkflowPublishBlockedDetails({ reason, versionId: 'version-1' })).toBe(true);
		},
	);

	test.each([
		undefined,
		{},
		{ reason: 'approved', workflowReviewRequestId: 'review-1' },
		{ reason: 'review_pending', workflowReviewRequestId: '' },
		{
			reason: 'review_pending',
			workflowReviewRequestId: 'review-1',
			validationError: true,
		},
	])('rejects malformed blocker details: %j', (details) => {
		expect(isWorkflowPublishBlockedDetails(details)).toBe(false);
	});

	test('keeps blocker details in a source-control workflow status', () => {
		const result = SourceControlledFileSchema.parse({
			file: 'workflow.json',
			id: 'workflow-1',
			name: 'Reviewed workflow',
			type: 'workflow',
			status: 'modified',
			location: 'remote',
			conflict: false,
			updatedAt: '2026-07-29T00:00:00.000Z',
			publishingErrorDetails: {
				reason: 'review_pending',
				workflowReviewRequestId: 'review-1',
			},
		});

		expect(result.publishingErrorDetails).toEqual({
			reason: 'review_pending',
			workflowReviewRequestId: 'review-1',
		});
	});
});
