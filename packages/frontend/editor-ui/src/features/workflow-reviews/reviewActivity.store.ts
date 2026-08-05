import type { WorkflowReviewActivityEntry } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import { createWorkflowReviewComment, fetchWorkflowReviewActivity } from './workflowReviews.api';

const DEFAULT_LIMIT = 25;

function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

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

	let feedRequestSeq = 0;

	async function fetchFeed(reviewId: string) {
		const requestSeq = ++feedRequestSeq;
		// Cleared synchronously: otherwise the gap until the response arrives renders
		// the previous review's feed instead of the loading state.
		currentReviewId.value = reviewId;
		entries.value = [];
		nextCursor.value = null;
		hasMore.value = false;
		loadingMore.value = false;
		loading.value = true;
		error.value = null;

		try {
			const response = await fetchWorkflowReviewActivity(rootStore.restApiContext, reviewId, {
				limit: DEFAULT_LIMIT,
			});
			if (requestSeq !== feedRequestSeq) return;

			entries.value = response.data;
			nextCursor.value = response.nextCursor;
			hasMore.value = response.hasMore;
		} catch (e) {
			if (requestSeq !== feedRequestSeq) return;
			// Surfaced by the feed's own error row; the view must not also toast it.
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

			// One splice, so the older page keeps its ascending order.
			entries.value = [...response.data, ...entries.value];
			nextCursor.value = response.nextCursor;
			hasMore.value = response.hasMore;
		} catch (e) {
			if (requestSeq !== feedRequestSeq || currentReviewId.value !== reviewId) return;
			error.value = toError(e);
		} finally {
			if (requestSeq === feedRequestSeq) {
				loadingMore.value = false;
			}
		}
	}

	async function postComment(body: string) {
		const reviewId = currentReviewId.value;
		if (!reviewId) return;

		posting.value = true;
		try {
			const entry = await createWorkflowReviewComment(rootStore.restApiContext, reviewId, { body });
			if (currentReviewId.value !== reviewId) return;

			entries.value = [...entries.value, entry];
		} finally {
			posting.value = false;
		}
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
		fetchFeed,
		loadMore,
		postComment,
		reset,
	};
});
