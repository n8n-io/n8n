import { defineStore } from 'pinia';
import type {
	ListWorkflowReviewInboxResponse,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestState,
	WorkflowReviewInboxItem,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { computed, ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import {
	decideWorkflowReviewRequest,
	fetchWorkflowReviewInbox,
	fetchWorkflowReviewInboxSummary,
	fetchWorkflowReviewRequestDetail,
	type WorkflowReviewDecisionInput,
} from './workflowReviews.api';
import { toError } from './workflowReviews.utils';

const DEFAULT_LIMIT = 15;

export const useReviewInboxStore = defineStore('workflowReviewInbox', () => {
	const rootStore = useRootStore();

	const probeSettled = ref(false);
	const hasAnyReviews = ref(false);
	const openCount = ref(0);
	const closedCount = ref(0);
	const items = ref<WorkflowReviewInboxItem[]>([]);
	const detail = ref<WorkflowReviewRequestDetail | null>(null);
	const detailLoading = ref(false);
	const detailNotFound = ref(false);
	// The view hydrates this from `?state=` before probing so the first list fetch uses the URL state.
	const activeTab = ref<WorkflowReviewRequestState>('open');
	const nextCursor = ref<string | null>(null);
	const hasMore = ref(false);
	const loading = ref(false);
	const loadingMore = ref(false);
	const error = ref<Error | null>(null);

	let listRequestSeq = 0;
	let probeRequestSeq = 0;
	let detailRequestSeq = 0;
	const showSidebar = computed(() => probeSettled.value && hasAnyReviews.value);
	const isEmpty = computed(
		() => showSidebar.value && !loading.value && error.value === null && items.value.length === 0,
	);

	function applyListResponse(
		response: ListWorkflowReviewInboxResponse,
		{ append }: { append: boolean },
	): void {
		items.value = append ? [...items.value, ...response.data] : response.data;
		nextCursor.value = response.nextCursor;
		hasMore.value = response.hasMore;
	}

	async function requestList(cursor?: string): Promise<ListWorkflowReviewInboxResponse> {
		return await fetchWorkflowReviewInbox(rootStore.restApiContext, {
			state: activeTab.value,
			limit: DEFAULT_LIMIT,
			cursor,
		});
	}

	async function probeInbox() {
		const requestSeq = ++probeRequestSeq;
		probeSettled.value = false;
		error.value = null;

		try {
			const summary = await fetchWorkflowReviewInboxSummary(rootStore.restApiContext);
			if (requestSeq !== probeRequestSeq) {
				return;
			}

			openCount.value = summary.open;
			closedCount.value = summary.closed;
			hasAnyReviews.value = summary.open + summary.closed > 0;
			probeSettled.value = true;

			if (hasAnyReviews.value) {
				await fetchList({ reset: true });
			}
		} catch (e) {
			if (requestSeq !== probeRequestSeq) {
				return;
			}
			error.value = toError(e);
			probeSettled.value = true;
			throw e;
		}
	}

	async function fetchList(options: { reset?: boolean } = {}) {
		const requestSeq = ++listRequestSeq;

		if (options.reset) {
			items.value = [];
			nextCursor.value = null;
			hasMore.value = false;
			// Invalidate any in-flight loadMore so pagination is not stuck.
			loadingMore.value = false;
		}

		loading.value = true;
		error.value = null;

		try {
			const response = await requestList();
			if (requestSeq !== listRequestSeq) {
				return;
			}
			applyListResponse(response, { append: false });
		} catch (e) {
			if (requestSeq !== listRequestSeq) {
				return;
			}
			error.value = toError(e);
			throw e;
		} finally {
			if (requestSeq === listRequestSeq) {
				loading.value = false;
			}
		}
	}

	async function loadMore() {
		if (loading.value || loadingMore.value || !hasMore.value || !nextCursor.value) {
			return;
		}

		const requestSeq = ++listRequestSeq;
		const cursor = nextCursor.value;
		loadingMore.value = true;
		error.value = null;

		try {
			const response = await requestList(cursor);
			if (requestSeq !== listRequestSeq) {
				return;
			}
			applyListResponse(response, { append: true });
		} catch (e) {
			if (requestSeq !== listRequestSeq) {
				return;
			}
			error.value = toError(e);
			throw e;
		} finally {
			if (requestSeq === listRequestSeq) {
				loadingMore.value = false;
			}
		}
	}

	async function setActiveTab(tab: WorkflowReviewRequestState) {
		if (activeTab.value === tab) return;
		activeTab.value = tab;
		await fetchList({ reset: true });
	}

	async function fetchDetail(id: string) {
		const requestSeq = ++detailRequestSeq;
		detail.value = null;
		detailLoading.value = true;
		detailNotFound.value = false;

		try {
			const response = await fetchWorkflowReviewRequestDetail(rootStore.restApiContext, id);
			if (requestSeq !== detailRequestSeq) {
				return;
			}
			detail.value = response;
		} catch (e) {
			if (requestSeq !== detailRequestSeq) {
				return;
			}
			if (e instanceof ResponseError && e.httpStatusCode === 404) {
				detailNotFound.value = true;
				return;
			}
			// deliberately not `toError(e)`: that ref is list-scoped and gates
			// `isEmpty`, so a detail failure would suppress the list empty state
			// for the rest of the session.
			throw e;
		} finally {
			if (requestSeq === detailRequestSeq) {
				detailLoading.value = false;
			}
		}
	}

	function clearDetail() {
		detailRequestSeq += 1;
		detail.value = null;
		detailLoading.value = false;
		detailNotFound.value = false;
	}

	/**
	 * Submit a decision and patch the affected item in place. Approving closes
	 * the request; the closed tab refetches on activation and picks it up there.
	 * Returns the response so callers can surface the auto-publish outcome.
	 */
	async function decideOnReview(id: string, decision: WorkflowReviewDecisionInput) {
		const summary = await decideWorkflowReviewRequest(rootStore.restApiContext, id, { decision });

		const item = items.value.find((candidate) => candidate.id === id);
		if (item) {
			item.decision = summary.decision;
			item.state = summary.state;
			item.updatedAt = summary.updatedAt;
		}

		if (detail.value?.id === id) {
			detail.value.decision = summary.decision;
			detail.value.state = summary.state;
			detail.value.updatedAt = summary.updatedAt;
		}

		if (summary.state === 'closed') {
			openCount.value = Math.max(0, openCount.value - 1);
			closedCount.value += 1;
		}

		// The list only shows items matching the active tab filter.
		if (item && item.state !== activeTab.value) {
			items.value = items.value.filter((candidate) => candidate.id !== item.id);
		}

		return summary;
	}

	function reset() {
		probeRequestSeq += 1;
		listRequestSeq += 1;
		detailRequestSeq += 1;
		probeSettled.value = false;
		hasAnyReviews.value = false;
		openCount.value = 0;
		closedCount.value = 0;
		items.value = [];
		detail.value = null;
		detailLoading.value = false;
		detailNotFound.value = false;
		activeTab.value = 'open';
		nextCursor.value = null;
		hasMore.value = false;
		loading.value = false;
		loadingMore.value = false;
		error.value = null;
	}

	return {
		probeSettled,
		hasAnyReviews,
		openCount,
		closedCount,
		items,
		detail,
		detailLoading,
		detailNotFound,
		activeTab,
		nextCursor,
		hasMore,
		loading,
		loadingMore,
		error,
		showSidebar,
		isEmpty,
		probeInbox,
		fetchList,
		loadMore,
		setActiveTab,
		fetchDetail,
		clearDetail,
		decideOnReview,
		reset,
	};
});
