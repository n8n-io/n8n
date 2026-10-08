import { defineStore } from 'pinia';
import type {
	ListWorkflowReviewInboxResponse,
	WorkflowReviewInboxCategory,
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

/**
 * The open tab is split by authorship, the closed tab stays flat — three
 * independently paginated lists in total.
 */
export type ReviewInboxSectionKey = 'waiting' | 'authored' | 'closed';

type RequestPage = (cursor?: string) => Promise<ListWorkflowReviewInboxResponse>;

/** One keyset-paginated list with its own pagination and load-more state. */
function createInboxListSlice(requestPage: RequestPage) {
	const items = ref<WorkflowReviewInboxItem[]>([]);
	const nextCursor = ref<string | null>(null);
	const hasMore = ref(false);
	const loading = ref(false);
	const loadingMore = ref(false);
	const error = ref<Error | null>(null);
	// Which request failed, so `retry` repeats that one — a failed load-more keeps
	// its rows and cursor, so retrying it must re-request the same page.
	const failedRequest = ref<'list' | 'loadMore' | null>(null);

	let requestSeq = 0;

	function applyResponse(
		response: ListWorkflowReviewInboxResponse,
		{ append }: { append: boolean },
	): void {
		items.value = append ? [...items.value, ...response.data] : response.data;
		nextCursor.value = response.nextCursor;
		hasMore.value = response.hasMore;
	}

	async function fetchList() {
		const seq = ++requestSeq;

		items.value = [];
		nextCursor.value = null;
		hasMore.value = false;
		// Invalidate any in-flight loadMore so pagination is not stuck.
		loadingMore.value = false;
		loading.value = true;
		error.value = null;
		failedRequest.value = null;

		try {
			const response = await requestPage();
			if (seq !== requestSeq) return;
			applyResponse(response, { append: false });
		} catch (e) {
			if (seq !== requestSeq) return;
			error.value = toError(e);
			failedRequest.value = 'list';
		} finally {
			if (seq === requestSeq) {
				loading.value = false;
			}
		}
	}

	async function loadMore() {
		if (loading.value || loadingMore.value || !hasMore.value || !nextCursor.value) {
			return;
		}

		const seq = ++requestSeq;
		const cursor = nextCursor.value;
		loadingMore.value = true;
		error.value = null;
		failedRequest.value = null;

		try {
			const response = await requestPage(cursor);
			if (seq !== requestSeq) return;
			applyResponse(response, { append: true });
		} catch (e) {
			if (seq !== requestSeq) return;
			// Rows and cursor are deliberately left in place, so the retry asks for
			// the same page instead of restarting the section.
			error.value = toError(e);
			failedRequest.value = 'loadMore';
		} finally {
			if (seq === requestSeq) {
				loadingMore.value = false;
			}
		}
	}

	async function retry() {
		if (failedRequest.value === 'loadMore') {
			await loadMore();
			return;
		}
		await fetchList();
	}

	function findItem(id: string): WorkflowReviewInboxItem | null {
		return items.value.find((candidate) => candidate.id === id) ?? null;
	}

	function removeItem(id: string): void {
		items.value = items.value.filter((candidate) => candidate.id !== id);
	}

	function reset(): void {
		requestSeq += 1;
		items.value = [];
		nextCursor.value = null;
		hasMore.value = false;
		loading.value = false;
		loadingMore.value = false;
		error.value = null;
		failedRequest.value = null;
	}

	/** Settled with nothing to show — never "empty" while loading or after a failure. */
	const isEmpty = computed(
		() => !loading.value && error.value === null && items.value.length === 0,
	);
	const initialLoadFailed = computed(() => failedRequest.value === 'list');

	return {
		items,
		nextCursor,
		hasMore,
		loading,
		loadingMore,
		error,
		isEmpty,
		initialLoadFailed,
		fetchList,
		loadMore,
		retry,
		findItem,
		removeItem,
		reset,
	};
}

export const useReviewInboxStore = defineStore('workflowReviewInbox', () => {
	const rootStore = useRootStore();

	const openCount = ref<number | null>(null);
	const closedCount = ref<number | null>(null);
	const detail = ref<WorkflowReviewRequestDetail | null>(null);
	const detailLoading = ref(false);
	const detailNotFound = ref(false);
	// The view hydrates this from `?state=` so the first list fetch uses the URL state.
	const activeTab = ref<WorkflowReviewRequestState>('open');

	let summaryRequestSeq = 0;
	let detailRequestSeq = 0;

	function requestPage(
		state: WorkflowReviewRequestState,
		category?: WorkflowReviewInboxCategory,
	): RequestPage {
		return async (cursor?: string) =>
			await fetchWorkflowReviewInbox(rootStore.restApiContext, {
				state,
				category,
				limit: DEFAULT_LIMIT,
				cursor,
			});
	}

	/**
	 * Plain object of slices, not a `ref`/`reactive` wrapper: the slice internals
	 * stay refs and Pinia unwraps them on access, so consumers read
	 * `store.sections.waiting.items` directly. `storeToRefs` does not reach into
	 * this object.
	 */
	const sections = {
		waiting: createInboxListSlice(requestPage('open', 'waiting')),
		authored: createInboxListSlice(requestPage('open', 'authored')),
		closed: createInboxListSlice(requestPage('closed')),
	};

	const allSlices = [sections.waiting, sections.authored, sections.closed];

	const activeSlices = computed(() =>
		activeTab.value === 'closed' ? [sections.closed] : [sections.waiting, sections.authored],
	);

	const hasItemsInActiveTab = computed(() =>
		activeSlices.value.some((slice) => slice.items.value.length > 0),
	);

	const isLoadingActiveTab = computed(() =>
		activeSlices.value.some((slice) => slice.loading.value),
	);

	const activeTabInitialLoadFailed = computed(() =>
		activeSlices.value.some((slice) => slice.initialLoadFailed.value),
	);

	// Settled with nothing to show. A failed slice is not treated as empty.
	const isEmpty = computed(() => activeSlices.value.every((slice) => slice.isEmpty.value));

	/**
	 * Both open sections start together and settle before the tab is rendered.
	 * Each slice still owns its pagination state after the initial load.
	 */
	async function fetchActiveTab() {
		if (activeTab.value === 'closed') {
			await sections.closed.fetchList();
			return;
		}

		await Promise.all([sections.waiting.fetchList(), sections.authored.fetchList()]);
	}

	async function fetchSummary() {
		const requestSeq = ++summaryRequestSeq;

		try {
			const summary = await fetchWorkflowReviewInboxSummary(rootStore.restApiContext);
			if (requestSeq !== summaryRequestSeq) return;

			openCount.value = summary.open;
			closedCount.value = summary.closed;
		} catch {
			// Counts enhance the tabs and no-selection state, but never block the lists.
		}
	}

	async function loadMore(section: ReviewInboxSectionKey) {
		await sections[section].loadMore();
	}

	async function retry(section: ReviewInboxSectionKey) {
		await sections[section].retry();
	}

	async function setActiveTab(tab: WorkflowReviewRequestState) {
		if (activeTab.value === tab) return;
		activeTab.value = tab;
		await fetchActiveTab();
	}

	function findItemById(id: string): WorkflowReviewInboxItem | null {
		for (const slice of allSlices) {
			const item = slice.findItem(id);
			if (item) return item;
		}
		return null;
	}

	async function fetchDetail(id: string) {
		const requestSeq = ++detailRequestSeq;
		const switchedReview = detail.value?.id !== id;
		if (switchedReview) {
			detail.value = null;
			detailLoading.value = true;
			detailNotFound.value = false;
		}

		try {
			const response = await fetchWorkflowReviewRequestDetail(rootStore.restApiContext, id);
			if (requestSeq !== detailRequestSeq) {
				return;
			}
			detail.value = response;
			detailNotFound.value = false;
		} catch (e) {
			if (requestSeq !== detailRequestSeq) {
				return;
			}
			if (e instanceof ResponseError && e.httpStatusCode === 404) {
				detailNotFound.value = true;
				return;
			}
			// deliberately not stored on a list-scoped error ref: those gate the
			// section empty states, so a detail failure would suppress them for the
			// rest of the session.
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
	 * Decisions never change authorship, so an item never moves between the
	 * waiting and authored sections. Returns the response so callers can surface
	 * the auto-publish outcome.
	 */
	async function decideOnReview(id: string, input: WorkflowReviewDecisionInput) {
		const summary = await decideWorkflowReviewRequest(rootStore.restApiContext, id, input);

		const item = findItemById(id);
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
			if (openCount.value !== null) openCount.value = Math.max(0, openCount.value - 1);
			if (closedCount.value !== null) closedCount.value += 1;
		}

		// The sections only show items matching the active tab filter.
		if (item && item.state !== activeTab.value) {
			for (const slice of allSlices) {
				slice.removeItem(id);
			}
		}

		return summary;
	}

	function reset() {
		summaryRequestSeq += 1;
		detailRequestSeq += 1;
		openCount.value = null;
		closedCount.value = null;
		detail.value = null;
		detailLoading.value = false;
		detailNotFound.value = false;
		activeTab.value = 'open';
		for (const slice of allSlices) {
			slice.reset();
		}
	}

	return {
		openCount,
		closedCount,
		sections,
		detail,
		detailLoading,
		detailNotFound,
		activeTab,
		isEmpty,
		isLoadingActiveTab,
		activeTabInitialLoadFailed,
		hasItemsInActiveTab,
		fetchSummary,
		fetchActiveTab,
		loadMore,
		retry,
		setActiveTab,
		findItemById,
		fetchDetail,
		clearDetail,
		decideOnReview,
		reset,
	};
});
