import { decideWorkflowPublishingAction } from '../workflow-publishing-policy';

describe('decideWorkflowPublishingAction', () => {
	it.each([
		{
			policy: 'preserve-published-state' as const,
			status: 'created' as const,
			sourcePublished: true,
			priorWasPublished: false,
			currentlyPublished: false,
			expected: 'noop',
		},
		{
			policy: 'preserve-published-state' as const,
			status: 'updated' as const,
			sourcePublished: true,
			priorWasPublished: true,
			currentlyPublished: true,
			expected: 'publish',
		},
		{
			// A draft source should not be published, even when the prior version was.
			policy: 'preserve-published-state' as const,
			status: 'updated' as const,
			sourcePublished: false,
			priorWasPublished: true,
			currentlyPublished: true,
			expected: 'noop',
		},
		{
			policy: 'match-source' as const,
			status: 'created' as const,
			sourcePublished: true,
			priorWasPublished: false,
			currentlyPublished: false,
			expected: 'publish',
		},
		{
			policy: 'match-source' as const,
			status: 'updated' as const,
			sourcePublished: false,
			priorWasPublished: true,
			currentlyPublished: true,
			expected: 'unpublish',
		},
		{
			policy: 'all-published' as const,
			status: 'created' as const,
			sourcePublished: false,
			priorWasPublished: false,
			currentlyPublished: false,
			expected: 'publish',
		},
		{
			policy: 'all-unpublished' as const,
			status: 'updated' as const,
			sourcePublished: true,
			priorWasPublished: true,
			currentlyPublished: true,
			expected: 'unpublish',
		},
	])('$policy + $status → $expected', (testCase) => {
		expect(
			decideWorkflowPublishingAction(testCase.policy, {
				status: testCase.status,
				sourcePublished: testCase.sourcePublished,
				priorWasPublished: testCase.priorWasPublished,
				currentlyPublished: testCase.currentlyPublished,
				isArchived: false,
			}),
		).toBe(testCase.expected);
	});

	it('returns noop for skipped imports regardless of policy', () => {
		expect(
			decideWorkflowPublishingAction('all-published', {
				status: 'skipped',
				sourcePublished: true,
				priorWasPublished: true,
				currentlyPublished: true,
				isArchived: false,
			}),
		).toBe('noop');
	});

	it('unpublishes archived workflows that were published', () => {
		expect(
			decideWorkflowPublishingAction('all-published', {
				status: 'updated',
				sourcePublished: true,
				priorWasPublished: true,
				currentlyPublished: true,
				isArchived: true,
			}),
		).toBe('unpublish');
	});
});
