import type { PullRequestReviewStateEntry } from './code-review-provider';

/** Mirrors GitHub's latest-review-per-user heuristic for open PRs. */
export function computePullRequestIsApproved(reviews: PullRequestReviewStateEntry[]): boolean {
	const latestByAuthor = new Map<string, PullRequestReviewStateEntry['state']>();

	const sorted = [...reviews].sort(
		(a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
	);

	for (const review of sorted) {
		if (review.state === 'DISMISSED' || review.state === 'PENDING') continue;
		const key = review.author ?? 'unknown';
		latestByAuthor.set(key, review.state);
	}

	const states = [...latestByAuthor.values()];
	if (states.length === 0) return false;
	if (states.some((state) => state === 'CHANGES_REQUESTED')) return false;
	return states.some((state) => state === 'APPROVED');
}
