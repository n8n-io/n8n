import type { WorkflowReviewActivityEntry } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import { createWorkflowReviewComment, fetchWorkflowReviewActivity } from './workflowReviews.api';
import { toError } from './workflowReviews.utils';

const DEFAULT_LIMIT = 25;

/**
 * The activity feed of one review. `entries` is ascending by id: the backend pages
 * backwards, so `loadMore` prepends older pages and `postComment` appends.
 */
export const useReviewActivityStore = defineStore('workflowReviewActivity', () => {
	const rootStore = useRootStore();

	const currentReviewId = ref<string | null>(null);
	const entries = ref<WorkflowReviewActivityEntry[]>([]);
	const nextCursor = ref<string | null>(null);
	const hasMore = ref(false);
	const loading = ref(false);
	const loadingMore = ref(false);
	const posting = ref(false);
	const error = ref<Error | null>(null);
	// Held here, not in the composer: switching to the Changes tab unmounts it, and a
	// half-typed comment must survive that.
	const draft = ref('');
	// Held here, not in the popover: the popover is not keyed on the review, so a local ref
	// would carry review A's note into review B. This copy goes with the feed when the
	// selection changes.
	const decisionNote = ref('');

	let feedRequestSeq = 0;
	let postSeq = 0;

	async function fetchFeed(reviewId: string) {
		const requestSeq = ++feedRequestSeq;
		const switchedReview = currentReviewId.value !== reviewId;
		currentReviewId.value = reviewId;
		nextCursor.value = null;
		hasMore.value = false;
		loadingMore.value = false;
		loading.value = true;
		error.value = null;
		// Clearing on a refetch would drop a comment the viewer just posted onto a feed whose
		// first page failed, re-enable send mid-post, and discard what they are typing. On a
		// switch it has to go synchronously, or the gap until the response arrives renders the
		// previous review's feed.
		if (switchedReview) {
			entries.value = [];
			posting.value = false;
			draft.value = '';
			decisionNote.value = '';
		}

		try {
			const response = await fetchWorkflowReviewActivity(rootStore.restApiContext, reviewId, {
				limit: DEFAULT_LIMIT,
			});
			if (requestSeq !== feedRequestSeq) return;

			// Merged, not assigned: a comment posted while this page was in flight is already
			// appended, and the server snapshot predates it. Only what is newer than the page
			// survives, since `entries` is ascending by id and an older page kept here would
			// land after the newer one and invert the list.
			const newestInPage = Number(response.data.at(-1)?.id ?? 0);
			entries.value = [
				...response.data,
				...entries.value.filter((entry) => Number(entry.id) > newestInPage),
			];
			nextCursor.value = response.nextCursor;
			hasMore.value = response.hasMore;
		} catch (e) {
			if (requestSeq !== feedRequestSeq) return;
			// Deliberately recorded rather than thrown: load failures belong in the feed's
			// error row, not in a toast.
			error.value = toError(e);
		} finally {
			if (requestSeq === feedRequestSeq) {
				loading.value = false;
			}
		}
	}

	async function loadMore() {
		const reviewId = currentReviewId.value;
		const cursor = nextCursor.value;
		if (!reviewId || !cursor || loading.value || loadingMore.value) return;

		const requestSeq = ++feedRequestSeq;
		loadingMore.value = true;
		error.value = null;

		try {
			const response = await fetchWorkflowReviewActivity(rootStore.restApiContext, reviewId, {
				limit: DEFAULT_LIMIT,
				cursor,
			});
			if (requestSeq !== feedRequestSeq || currentReviewId.value !== reviewId) return;

			entries.value = [...response.data, ...entries.value];
			nextCursor.value = response.nextCursor;
			// A page that returns nothing ends the walk: keeping `hasMore` would re-arm the
			// sentinel on an unchanged list and intersect forever.
			hasMore.value = response.hasMore && response.data.length > 0;
		} catch (e) {
			if (requestSeq !== feedRequestSeq || currentReviewId.value !== reviewId) return;
			error.value = toError(e);
		} finally {
			if (requestSeq === feedRequestSeq) {
				loadingMore.value = false;
			}
		}
	}

	/**
	 * Resolves `false` when the viewer moved to another review while the post was in flight:
	 * the comment was written, but nothing about it belongs on the review they are reading now.
	 */
	async function postComment(body: string): Promise<boolean> {
		const reviewId = currentReviewId.value;
		// Thrown, not swallowed: a silent return would read as success to the caller.
		if (!reviewId) throw new Error('Cannot post a comment without a selected review');

		const requestSeq = ++postSeq;
		posting.value = true;
		try {
			const entry = await createWorkflowReviewComment(rootStore.restApiContext, reviewId, { body });
			if (currentReviewId.value !== reviewId) return false;

			// A feed refetch that raced this post may already carry the comment.
			entries.value = [...entries.value.filter((existing) => existing.id !== entry.id), entry];
			return true;
		} finally {
			// Only the newest post owns the flag: after A -> B -> A a stale post finishing would
			// otherwise re-enable send while the post the user is waiting on is still in flight.
			if (requestSeq === postSeq) posting.value = false;
		}
	}

	/**
	 * Clears the decision note, unless the viewer typed something else since the submit
	 * `expected` came from — both callers await a request first.
	 */
	function clearDecisionNote(expected: string) {
		if (decisionNote.value.trim() === expected) decisionNote.value = '';
	}

	function reset() {
		feedRequestSeq += 1;
		currentReviewId.value = null;
		entries.value = [];
		nextCursor.value = null;
		hasMore.value = false;
		loading.value = false;
		loadingMore.value = false;
		posting.value = false;
		error.value = null;
		draft.value = '';
		decisionNote.value = '';
	}

	return {
		currentReviewId,
		entries,
		nextCursor,
		hasMore,
		loading,
		loadingMore,
		posting,
		error,
		draft,
		decisionNote,
		fetchFeed,
		loadMore,
		postComment,
		clearDecisionNote,
		reset,
	};
});
