import { computePullRequestIsApproved } from '../pull-request-approval.utils';
import type { PullRequestReviewStateEntry } from '../code-review-provider';

describe('computePullRequestIsApproved', () => {
	it('returns false when there are no submitted reviews', () => {
		expect(computePullRequestIsApproved([])).toBe(false);
	});

	it('returns true when a reviewer approved and no changes were requested', () => {
		const reviews: PullRequestReviewStateEntry[] = [
			{
				author: 'alice',
				state: 'APPROVED',
				submittedAt: '2026-06-01T00:00:00Z',
			},
		];
		expect(computePullRequestIsApproved(reviews)).toBe(true);
	});

	it('returns false when the latest review requests changes', () => {
		const reviews: PullRequestReviewStateEntry[] = [
			{
				author: 'alice',
				state: 'APPROVED',
				submittedAt: '2026-06-01T00:00:00Z',
			},
			{
				author: 'alice',
				state: 'CHANGES_REQUESTED',
				submittedAt: '2026-06-02T00:00:00Z',
			},
		];
		expect(computePullRequestIsApproved(reviews)).toBe(false);
	});

	it('ignores dismissed and pending reviews', () => {
		const reviews: PullRequestReviewStateEntry[] = [
			{
				author: 'alice',
				state: 'DISMISSED',
				submittedAt: '2026-06-01T00:00:00Z',
			},
			{
				author: 'alice',
				state: 'PENDING',
				submittedAt: '2026-06-02T00:00:00Z',
			},
		];
		expect(computePullRequestIsApproved(reviews)).toBe(false);
	});
});
