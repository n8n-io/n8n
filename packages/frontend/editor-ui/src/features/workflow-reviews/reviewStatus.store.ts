import type {
	WorkflowReviewRequestForWorkflow,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { readonly, ref } from 'vue';

import { fetchWorkflowReviewRequests } from '@/features/workflow-reviews/workflowReviews.api';

/**
 * Authoritative state of a workflow's *latest* review — one request serves both
 * the open-review gate and the canvas banner, which also needs the last approved
 * review. `null` means "fetched, no review"; a missing key means "not fetched yet".
 */
export const useWorkflowReviewStatusStore = defineStore('workflowReviewStatus', () => {
	const rootStore = useRootStore();

	const latestReviewByWorkflowId = ref<Record<string, WorkflowReviewRequestForWorkflow | null>>({});
	// Latest-wins: only the most recently started fetch may write its outcome.
	const latestSequenceByWorkflowId: Record<string, number> = {};

	const latestReviewRequest = (workflowId: string): WorkflowReviewRequestForWorkflow | null => {
		return latestReviewByWorkflowId.value[workflowId] ?? null;
	};

	/**
	 * The latest review only while it is still open. There is at most one open
	 * review per workflow, so the latest request is the only candidate.
	 */
	const openReviewRequest = (workflowId: string): WorkflowReviewRequestForWorkflow | null => {
		const review = latestReviewRequest(workflowId);
		return review?.state === 'open' ? review : null;
	};

	/** The single client-side seam deriving "this workflow has an open review". */
	const hasOpenReview = (workflowId: string): boolean => {
		return openReviewRequest(workflowId) !== null;
	};

	/** True when a newer fetch has started since this one. */
	const isStale = (workflowId: string, sequence: number): boolean =>
		sequence !== latestSequenceByWorkflowId[workflowId];

	const fetchStatus = async (workflowId: string): Promise<void> => {
		const sequence = (latestSequenceByWorkflowId[workflowId] ?? 0) + 1;
		latestSequenceByWorkflowId[workflowId] = sequence;

		try {
			// No state filter: the newest review answers both questions, keeping the
			// canvas to a single workflow-review request.
			const { data } = await fetchWorkflowReviewRequests(rootStore.restApiContext, {
				workflowId,
				take: 1,
			});
			if (isStale(workflowId, sequence)) return;
			latestReviewByWorkflowId.value[workflowId] = data[0] ?? null;
		} catch (error) {
			if (isStale(workflowId, sequence)) return;
			if (
				error instanceof ResponseError &&
				(error.httpStatusCode === 404 || error.httpStatusCode === 403)
			) {
				// Access or feature revoked — fall back to the local preference.
				delete latestReviewByWorkflowId.value[workflowId];
				return;
			}
			// Transient error: keep the last known status. This is a background
			// sync; unknown status degrades to local-pref behavior and the
			// backend remains the real gate.
		}
	};

	/**
	 * Adopt a freshly opened review as the latest one, without waiting for a
	 * refetch. Mutation responses carry the minimal summary: a brand-new review is
	 * pending, so neither derived field applies yet.
	 */
	const setOpenReview = (
		workflowId: string,
		review: WorkflowReviewRequestSummary,
		description: string | null = null,
	): void => {
		latestSequenceByWorkflowId[workflowId] = (latestSequenceByWorkflowId[workflowId] ?? 0) + 1;
		latestReviewByWorkflowId.value[workflowId] = {
			...review,
			description,
			decisionBy: null,
			approvedVersionPublicationState: null,
		};
	};

	return {
		// all writes must go through fetchStatus/setOpenReview so the sequence
		// protocol stays the only write path.
		latestReviewByWorkflowId: readonly(latestReviewByWorkflowId),
		latestReviewRequest,
		openReviewRequest,
		hasOpenReview,
		fetchStatus,
		setOpenReview,
	};
});
