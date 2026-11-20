import { errorSummary } from '../error-summary.mjs';
import { getChangesBetween, getPrEvents, getPrReviews } from '../github-helpers.mjs';
import { isMigrationBump } from './is-migration-bump.mjs';

/**
 * @typedef {Awaited<ReturnType<typeof getPrReviews>>[number]} Review
 */

/**
 * The latest review per reviewer that carries a state; a later approval, change request or dismissal replaces an earlier one.
 *
 * @param {Review[]} reviews
 * @returns {Review[]}
 */
function latestReviews(reviews) {
	const sorted = reviews
		.filter((review) => review.user?.login)
		.filter((review) => ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state))
		.toSorted(
			(a, b) => new Date(a.submitted_at ?? 0).getTime() - new Date(b.submitted_at ?? 0).getTime(),
		);

	const latest = new Map();
	for (const review of sorted) latest.set(review.user?.login, review);
	return [...latest.values()];
}

/**
 * True when one of the dismissed reviews is an approval that a bump push dismissed, with only bump commits after it.
 * A failed GitHub call counts as no such approval.
 *
 * @param {number} pullRequestNumber
 * @param {string} headSha
 * @param {Review[]} dismissed
 * @returns {Promise<boolean>}
 */
async function hasApprovalDismissedByBump(pullRequestNumber, headSha, dismissed) {
	let found = false;
	try {
		const events = await getPrEvents(pullRequestNumber);
		for (const review of dismissed) {
			const dismissal = events.find(
				(event) =>
					event.event === 'review_dismissed' && event.dismissed_review?.review_id === review.id,
			)?.dismissed_review;
			if (!found && dismissal?.state === 'approved' && review.commit_id) {
				const changes = await getChangesBetween(review.commit_id, headSha);
				const dismissedByBump =
					changes?.commits.some(({ sha }) => sha === dismissal.dismissal_commit_id) ?? false;
				found = changes !== null && dismissedByBump && isMigrationBump(changes);
			}
		}
	} catch (error) {
		console.log(`Could not check dismissed approvals for a migration bump: ${errorSummary(error)}`);
	}
	return found;
}

/**
 * True when the PR had an approval before the bump and nobody requested changes since.
 *
 * @param {number} pullRequestNumber
 * @param {string} headSha The bump commit.
 * @returns {Promise<boolean>}
 */
export async function hasRestorableApproval(pullRequestNumber, headSha) {
	const reviews = await getPrReviews(pullRequestNumber);
	const latest = latestReviews(reviews);
	const changesRequested = latest.some(({ state }) => state === 'CHANGES_REQUESTED');
	const approved = latest.some(({ state }) => state === 'APPROVED');
	const dismissed = latest.filter(({ state }) => state === 'DISMISSED');

	let approvedBeforeBump = approved;
	if (!changesRequested && !approved && dismissed.length > 0) {
		approvedBeforeBump = await hasApprovalDismissedByBump(pullRequestNumber, headSha, dismissed);
	}
	return !changesRequested && approvedBeforeBump;
}
