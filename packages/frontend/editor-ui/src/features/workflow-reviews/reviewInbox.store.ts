import { defineStore } from 'pinia';
import type {
	ListWorkflowReviewInboxResponse,
	WorkflowReviewRequestState,
	WorkflowReviewInboxItem,
} from '@n8n/api-types';
import { computed, ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import {
	decideWorkflowReviewRequest,
	fetchWorkflowReviewInbox,
	fetchWorkflowReviewInboxSummary,
	type WorkflowReviewDecisionInput,
} from './workflowReviews.api';

const DEFAULT_LIMIT = 15;

function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export const useReviewInboxStore = defineStore('workflowReviewInbox', () => {
	const rootStore = useRootStore();

	const probeSettled = ref(false);
	const hasAnyReviews = ref(false);
	const openCount = ref(0);
	const closedCount = ref(0);
	const items = ref<WorkflowReviewInboxItem[]>([]);
	const selectedId = ref<string | null>(null);
	const activeTab = ref<WorkflowReviewRequestState>('open');
	const nextCursor = ref<string | null>(null);
	const hasMore = ref(false);
	const loading = ref(false);
	const loadingMore = ref(false);
	const error = ref<Error | null>(null);

	let listRequestSeq = 0;
	let probeRequestSeq = 0;

	const selectedItem = computed(
		() => items.value.find((item) => item.id === selectedId.value) ?? null,
	);
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
			selectedId.value = null;
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

	/**
	 * Submit a decision and patch the affected item in place. Approving closes
	 * the request; the closed tab refetches on activation and picks it up there.
	 */
	async function decideOnReview(id: string, decision: WorkflowReviewDecisionInput) {
		const summary = await decideWorkflowReviewRequest(rootStore.restApiContext, id, { decision });

		const item = items.value.find((candidate) => candidate.id === id);
		if (item) {
			item.decision = summary.decision;
			item.state = summary.state;
			item.updatedAt = summary.updatedAt;
		}

		if (summary.state === 'closed') {
			openCount.value = Math.max(0, openCount.value - 1);
			closedCount.value += 1;
		}

		// The list only shows items matching the active tab filter.
		if (item && item.state !== activeTab.value) {
			items.value = items.value.filter((candidate) => candidate.id !== item.id);
			if (selectedId.value === item.id) {
				selectedId.value = null;
			}
		}
	}

	function selectItem(id: string) {
		selectedId.value = id;
	}

	function clearSelection() {
		selectedId.value = null;
	}

	function reset() {
		probeRequestSeq += 1;
		listRequestSeq += 1;
		probeSettled.value = false;
		hasAnyReviews.value = false;
		openCount.value = 0;
		closedCount.value = 0;
		items.value = [];
		selectedId.value = null;
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
		selectedId,
		selectedItem,
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
		decideOnReview,
		selectItem,
		clearSelection,
		reset,
	};
});
