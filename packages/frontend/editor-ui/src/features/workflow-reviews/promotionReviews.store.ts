import type {
	PromotionReviewDetailDto,
	PromotionReviewSummary,
	PromotionReviewTab,
	PromotionReviewWorkflowDiffDto,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	approvePromotionReview,
	fetchPromotionReviewDetail,
	fetchPromotionReviews,
	fetchPromotionReviewWorkflowDiff,
} from './promotionReviews.api';

/** Route param prefix that tells a Promotion Review apart from a Workflow Review. */
export const PROMOTION_REVIEW_ID_PREFIX = 'promotion:';

export function isPromotionReviewId(id: string | null): id is string {
	return id !== null && id.startsWith(PROMOTION_REVIEW_ID_PREFIX);
}

export function toPromotionReviewRouteId(reviewId: string): string {
	return `${PROMOTION_REVIEW_ID_PREFIX}${reviewId}`;
}

export function fromPromotionReviewRouteId(id: string): string {
	return id.slice(PROMOTION_REVIEW_ID_PREFIX.length);
}

/** The title lives on the Git host. The branch name stands in when the host did not answer. */
export function promotionReviewTitle(review: PromotionReviewSummary): string {
	return review.remote?.title ?? review.branchName;
}

const PAGE_SIZE = 50;

/**
 * Promotion Reviews shown in the review inbox next to Workflow Reviews. Only
 * owners and admins hold the Git connection scopes, so other users never ask.
 * A failed list is silent: the inbox must not break when promotions are off.
 */
export const usePromotionReviewsStore = defineStore('promotionReviews', () => {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();

	const items = ref<Record<PromotionReviewTab, PromotionReviewSummary[]>>({
		open: [],
		closed: [],
	});
	const counts = ref<Record<PromotionReviewTab, number | null>>({ open: null, closed: null });
	const loading = ref(false);
	const detail = ref<PromotionReviewDetailDto | null>(null);
	const detailLoading = ref(false);
	const detailNotFound = ref(false);
	const diffs = ref<Record<string, PromotionReviewWorkflowDiffDto>>({});

	let listRequestSeq = 0;
	let detailRequestSeq = 0;

	const canRead = computed(() => usersStore.isAdminOrOwner);

	async function fetchTab(tab: PromotionReviewTab) {
		if (!canRead.value) return;
		const seq = ++listRequestSeq;
		loading.value = true;
		try {
			const response = await fetchPromotionReviews(rootStore.restApiContext, {
				tab,
				take: PAGE_SIZE,
			});
			if (seq !== listRequestSeq) return;
			items.value[tab] = response.data;
			counts.value[tab] = response.count;
		} catch {
			// Promotions may be unlicensed or unconfigured. The inbox still works without them.
			if (seq !== listRequestSeq) return;
			items.value[tab] = [];
			counts.value[tab] = null;
		} finally {
			if (seq === listRequestSeq) loading.value = false;
		}
	}

	function findItemById(reviewId: string): PromotionReviewSummary | null {
		return (
			items.value.open.find((item) => item.id === reviewId) ??
			items.value.closed.find((item) => item.id === reviewId) ??
			null
		);
	}

	async function fetchDetail(reviewId: string) {
		const seq = ++detailRequestSeq;
		if (detail.value?.id !== reviewId) {
			detail.value = null;
			diffs.value = {};
			detailLoading.value = true;
			detailNotFound.value = false;
		}
		try {
			const response = await fetchPromotionReviewDetail(rootStore.restApiContext, reviewId);
			if (seq !== detailRequestSeq) return;
			detail.value = response;
			detailNotFound.value = false;
		} catch (error) {
			if (seq !== detailRequestSeq) return;
			if (error instanceof ResponseError && error.httpStatusCode === 404) {
				detailNotFound.value = true;
				return;
			}
			throw error;
		} finally {
			if (seq === detailRequestSeq) detailLoading.value = false;
		}
	}

	async function fetchWorkflowDiff(reviewId: string, workflowId: string) {
		const key = `${reviewId}:${workflowId}`;
		if (diffs.value[key]) return diffs.value[key];
		const diff = await fetchPromotionReviewWorkflowDiff(
			rootStore.restApiContext,
			reviewId,
			workflowId,
		);
		diffs.value[key] = diff;
		return diff;
	}

	/** Approves and merges. The detail and both lists are refreshed from the response. */
	async function approve(reviewId: string) {
		const response = await approvePromotionReview(rootStore.restApiContext, reviewId);
		detail.value = response;
		items.value.open = items.value.open.filter((item) => item.id !== reviewId);
		if (counts.value.open !== null) counts.value.open = Math.max(0, counts.value.open - 1);
		if (counts.value.closed !== null) counts.value.closed += 1;
		return response;
	}

	function clearDetail() {
		detailRequestSeq += 1;
		detail.value = null;
		diffs.value = {};
		detailLoading.value = false;
		detailNotFound.value = false;
	}

	function reset() {
		listRequestSeq += 1;
		detailRequestSeq += 1;
		items.value = { open: [], closed: [] };
		counts.value = { open: null, closed: null };
		loading.value = false;
		clearDetail();
	}

	return {
		items,
		counts,
		loading,
		detail,
		detailLoading,
		detailNotFound,
		canRead,
		fetchTab,
		findItemById,
		fetchDetail,
		fetchWorkflowDiff,
		approve,
		clearDetail,
		reset,
	};
});
