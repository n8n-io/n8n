import type { WorkflowReviewRequestSummary } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { readonly, ref } from 'vue';

import { fetchWorkflowReviewRequests } from '@/features/workflow-reviews/workflowReviews.api';

/**
 * Authoritative open-review state per workflow.
 * `null` means "fetched, no open review"; a missing key means "not fetched yet".
 */
export const useWorkflowReviewStatusStore = defineStore('workflowReviewStatus', () => {
	const rootStore = useRootStore();

	const openReviewByWorkflowId = ref<Record<string, WorkflowReviewRequestSummary | null>>({});
	// Monotonic per-workflow counters: `started` numbers each fetch, `applied`
	// records the newest fetch whose outcome was written. Comparing against
	// `applied` (not `started`) means a stale response can't clobber a newer
	// result, while a newer fetch failing transiently doesn't discard an older
	// in-flight success.
	const startedSequenceByWorkflowId: Record<string, number> = {};
	const appliedSequenceByWorkflowId: Record<string, number> = {};

	const openReviewRequest = (workflowId: string): WorkflowReviewRequestSummary | null => {
		return openReviewByWorkflowId.value[workflowId] ?? null;
	};

	/** The single client-side seam deriving "this workflow has an open review". */
	const hasOpenReview = (workflowId: string): boolean => {
		return openReviewRequest(workflowId) !== null;
	};

	/** True when a newer fetch has already written its outcome. */
	const isStale = (workflowId: string, sequence: number): boolean =>
		sequence <= (appliedSequenceByWorkflowId[workflowId] ?? 0);

	const fetchStatus = async (workflowId: string): Promise<void> => {
		const sequence = (startedSequenceByWorkflowId[workflowId] ?? 0) + 1;
		startedSequenceByWorkflowId[workflowId] = sequence;

		try {
			const { data } = await fetchWorkflowReviewRequests(rootStore.restApiContext, {
				workflowId,
				state: 'open',
				take: 1,
			});
			if (isStale(workflowId, sequence)) return;
			appliedSequenceByWorkflowId[workflowId] = sequence;
			openReviewByWorkflowId.value[workflowId] = data[0] ?? null;
		} catch (error) {
			if (isStale(workflowId, sequence)) return;
			if (
				error instanceof ResponseError &&
				(error.httpStatusCode === 404 || error.httpStatusCode === 403)
			) {
				// Access or feature revoked — fall back to the local preference.
				appliedSequenceByWorkflowId[workflowId] = sequence;
				delete openReviewByWorkflowId.value[workflowId];
				return;
			}
			// Transient error: keep the last known status and don't advance the
			// applied sequence, so an older in-flight success may still land.
			// This is a background sync; unknown status degrades to local-pref
			// behavior and the backend remains the real gate.
		}
	};

	const clearStatus = (workflowId: string): void => {
		delete openReviewByWorkflowId.value[workflowId];
	};

	return {
		// all writes must go through fetchStatus/clearStatus so the
		// sequence protocol stays the only write path.
		openReviewByWorkflowId: readonly(openReviewByWorkflowId),
		openReviewRequest,
		hasOpenReview,
		fetchStatus,
		clearStatus,
	};
});
