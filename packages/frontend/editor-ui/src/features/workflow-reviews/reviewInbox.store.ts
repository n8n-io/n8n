import { defineStore } from 'pinia';
import type {
	ListWorkflowReviewInboxResponse,
	WorkflowReviewRequestState,
	WorkflowReviewInboxItem,
} from '@n8n/api-types';
import { computed, ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import { fetchWorkflowReviewInbox, fetchWorkflowReviewInboxSummary } from './workflowReviews.api';

const DEFAULT_LIMIT = 15;

function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export const useReviewInboxStore = defineStore('workflowReviewInbox', () => {
	const rootStore = useRootStore();

	const probeSettled = ref(false);
	const hasAnyReviews = ref(false);
	const items = ref<WorkflowReviewInboxItem[]>([]);
	const selectedId = ref<string | null>(null);
	const activeState = ref<WorkflowReviewRequestState>('open');
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
			state: activeState.value,
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

			hasAnyReviews.value = summary.hasAny;
			probeSettled.value = true;

			if (summary.hasAny) {
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

	async function setActiveState(state: WorkflowReviewRequestState) {
		if (activeState.value === state) return;
		activeState.value = state;
		await fetchList({ reset: true });
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
		items.value = [];
		selectedId.value = null;
		activeState.value = 'open';
		nextCursor.value = null;
		hasMore.value = false;
		loading.value = false;
		loadingMore.value = false;
		error.value = null;
	}

	return {
		probeSettled,
		hasAnyReviews,
		items,
		selectedId,
		selectedItem,
		activeState,
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
		setActiveState,
		selectItem,
		clearSelection,
		reset,
	};
});
