import { decideWorkflowPublishingAction } from '../workflow-publishing-policy';
import { WorkflowPublishingPolicy } from '../workflow-publishing-policy.types';

describe('decideWorkflowPublishingAction', () => {
	it.each([
		{
			policy: WorkflowPublishingPolicy.PreservePublishedState,
			status: 'created' as const,
			sourcePublished: true,
			currentlyPublished: false,
			expected: 'noop',
		},
		{
			policy: WorkflowPublishingPolicy.PreservePublishedState,
			status: 'updated' as const,
			sourcePublished: true,
			currentlyPublished: true,
			expected: 'publish',
		},
		{
			// A draft source should not be published, even when the target is currently published.
			policy: WorkflowPublishingPolicy.PreservePublishedState,
			status: 'updated' as const,
			sourcePublished: false,
			currentlyPublished: true,
			expected: 'noop',
		},
		{
			policy: WorkflowPublishingPolicy.MatchSource,
			status: 'created' as const,
			sourcePublished: true,
			currentlyPublished: false,
			expected: 'publish',
		},
		{
			policy: WorkflowPublishingPolicy.MatchSource,
			status: 'updated' as const,
			sourcePublished: false,
			currentlyPublished: true,
			expected: 'unpublish',
		},
		{
			policy: WorkflowPublishingPolicy.PublishAll,
			status: 'created' as const,
			sourcePublished: false,
			currentlyPublished: false,
			expected: 'publish',
		},
		{
			policy: WorkflowPublishingPolicy.UnpublishAll,
			status: 'updated' as const,
			sourcePublished: true,
			currentlyPublished: true,
			expected: 'unpublish',
		},
	])('$policy + $status → $expected', (testCase) => {
		expect(
			decideWorkflowPublishingAction(testCase.policy, {
				status: testCase.status,
				sourcePublished: testCase.sourcePublished,
				currentlyPublished: testCase.currentlyPublished,
				isArchived: false,
			}),
		).toBe(testCase.expected);
	});

	it('returns noop for skipped imports regardless of policy', () => {
		expect(
			decideWorkflowPublishingAction(WorkflowPublishingPolicy.PublishAll, {
				status: 'skipped',
				sourcePublished: true,
				currentlyPublished: true,
				isArchived: false,
			}),
		).toBe('noop');
	});

	it('unpublishes archived workflows that were published', () => {
		expect(
			decideWorkflowPublishingAction(WorkflowPublishingPolicy.PublishAll, {
				status: 'updated',
				sourcePublished: true,
				currentlyPublished: true,
				isArchived: true,
			}),
		).toBe('unpublish');
	});
});
