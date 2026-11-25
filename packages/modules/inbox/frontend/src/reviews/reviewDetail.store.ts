import type { WorkflowReviewRequestDetail, WorkflowReviewRequestSummary } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	closeWorkflowReviewRequest,
	decideWorkflowReviewRequest,
	fetchWorkflowReviewRequestDetail,
	type WorkflowReviewDecisionInput,
} from './workflowReviews.api';

export const useReviewDetailStore = defineStore('workflowReviewDetail', () => {
	const rootStore = useRootStore();
	const detail = ref<WorkflowReviewRequestDetail | null>(null);
	const detailLoading = ref(false);
	const detailNotFound = ref(false);
	const deciding = ref(false);
	const selectionRevision = ref(0);
	let requestSeq = 0;

	async function fetchDetail(id: string) {
		const seq = ++requestSeq;
		if (detail.value?.id !== id) {
			detail.value = null;
			detailLoading.value = true;
			detailNotFound.value = false;
		}
		try {
			const response = await fetchWorkflowReviewRequestDetail(rootStore.restApiContext, id);
			if (seq !== requestSeq) return;
			detail.value = response;
			detailNotFound.value = false;
		} catch (error) {
			if (seq !== requestSeq) return;
			if (error instanceof ResponseError && error.httpStatusCode === 404) {
				detailNotFound.value = true;
				return;
			}
			throw error;
		} finally {
			if (seq === requestSeq) detailLoading.value = false;
		}
	}

	function applySummary(id: string, summary: WorkflowReviewRequestSummary) {
		if (detail.value?.id === id) {
			detail.value.decision = summary.decision;
			detail.value.state = summary.state;
			detail.value.updatedAt = summary.updatedAt;
		}
	}

	async function decideOnReview(id: string, input: WorkflowReviewDecisionInput) {
		const response = await decideWorkflowReviewRequest(rootStore.restApiContext, id, input);
		applySummary(id, response);
		return response;
	}

	async function closeReview(id: string) {
		const response = await closeWorkflowReviewRequest(rootStore.restApiContext, id);
		applySummary(id, response);
		return response;
	}

	function clearDetail() {
		requestSeq++;
		selectionRevision.value++;
		detail.value = null;
		detailLoading.value = false;
		detailNotFound.value = false;
	}

	return {
		detail,
		detailLoading,
		detailNotFound,
		deciding,
		selectionRevision,
		fetchDetail,
		decideOnReview,
		closeReview,
		clearDetail,
	};
});
