import type {
	InboxCategory,
	InboxItem,
	InboxSourceType,
	InboxState,
	ListInboxResponse,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';

import { fetchInbox, fetchInboxSummary } from './inbox.api';
import { INBOX_PAGE_LIMIT, type InboxItemChange, type InboxSectionKey } from './inbox.constants';
import { toError } from './reviews/workflowReviews.utils';

const sourceTypes: InboxSourceType[] = ['workflow_review', 'self_healing_result'];

type ListState = {
	items: InboxItem[];
	nextCursor: string | null;
	hasMore: boolean;
	hasLoaded: boolean;
	loading: boolean;
	loadingMore: boolean;
	error: Error | null;
	failedRequest: 'list' | 'loadMore' | null;
	partial: boolean;
};

function isSourceType(value: unknown): value is InboxSourceType {
	return value === 'workflow_review' || value === 'self_healing_result';
}

function disabledTypesFromError(error: unknown): InboxSourceType[] {
	const types = error instanceof ResponseError ? error.meta?.disabledSources : undefined;
	return Array.isArray(types) ? types.filter(isSourceType) : [];
}

export function createInboxListSlice(
	requestPage: (cursor?: string) => Promise<ListInboxResponse>,
	onDisabledSources: (types: InboxSourceType[]) => void,
	onPage?: (page: ListInboxResponse, append: boolean) => void,
) {
	const state = reactive<ListState>({
		items: [],
		nextCursor: null,
		hasMore: false,
		hasLoaded: false,
		loading: false,
		loadingMore: false,
		error: null,
		failedRequest: null,
		partial: false,
	});
	let requestSeq = 0;

	function applyResponse(page: ListInboxResponse, append: boolean) {
		onPage?.(page, append);
		onDisabledSources(page.disabledSources);
		state.hasLoaded = true;
		state.items = append ? [...state.items, ...page.data] : page.data;
		state.nextCursor = page.nextCursor;
		state.hasMore = page.hasMore;
		state.partial = page.partial;
	}

	async function fetchList() {
		const seq = ++requestSeq;
		state.items = [];
		state.nextCursor = null;
		state.hasMore = false;
		state.loading = true;
		state.loadingMore = false;
		state.error = null;
		state.failedRequest = null;
		try {
			const page = await requestPage();
			if (seq === requestSeq) applyResponse(page, false);
		} catch (error) {
			if (seq !== requestSeq) return;
			onDisabledSources(disabledTypesFromError(error));
			state.error = toError(error);
			state.failedRequest = 'list';
		} finally {
			if (seq === requestSeq) state.loading = false;
		}
	}

	async function loadMore() {
		if (state.loading || state.loadingMore || !state.hasMore || !state.nextCursor) return;
		const seq = ++requestSeq;
		state.loadingMore = true;
		state.error = null;
		state.failedRequest = null;
		try {
			const page = await requestPage(state.nextCursor);
			if (seq === requestSeq) applyResponse(page, true);
		} catch (error) {
			if (seq !== requestSeq) return;
			onDisabledSources(disabledTypesFromError(error));
			state.error = toError(error);
			state.failedRequest = 'loadMore';
		} finally {
			if (seq === requestSeq) state.loadingMore = false;
		}
	}

	function removeSources(types: InboxSourceType[]) {
		state.items = state.items.filter((item) => !types.includes(item.type));
	}

	function reset() {
		requestSeq++;
		state.items = [];
		state.hasLoaded = false;
		state.nextCursor = null;
		state.hasMore = false;
		state.loading = false;
		state.loadingMore = false;
		state.error = null;
		state.failedRequest = null;
		state.partial = false;
	}

	return Object.assign(state, {
		fetchList,
		loadMore,
		removeSources,
		reset,
		async retry() {
			if (state.failedRequest === 'loadMore') await loadMore();
			else await fetchList();
		},
	});
}

export const useInboxStore = defineStore('inbox', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const activeTab = ref<InboxState>('open');
	const openCount = ref<number | null>(null);
	const closedCount = ref<number | null>(null);
	const disabledSources = ref<InboxSourceType[]>([]);
	const enabled = computed(() => settingsStore.settings.inbox?.enabled === true);
	let summaryRequestSeq = 0;

	function removeDisabledSources(types: InboxSourceType[]) {
		if (types.length === 0) return;
		disabledSources.value = [...new Set([...disabledSources.value, ...types])];
		for (const list of Object.values(lists)) list.removeSources(types);
	}

	function reconcileSources(page: ListInboxResponse, partialSourceSet: boolean) {
		if (partialSourceSet) {
			const returnedTypes = page.data.map((item) => item.type);
			disabledSources.value = disabledSources.value.filter(
				(type) => page.disabledSources.includes(type) || !returnedTypes.includes(type),
			);
			return;
		}
		const settings = settingsStore.settings.inbox;
		const knownTypes = new Set([
			...(settings?.availableTypes ?? []),
			...(settings?.failedTypes ?? []),
			...page.data.map((item) => item.type),
		]);
		disabledSources.value = sourceTypes.filter(
			(type) =>
				!knownTypes.has(type) ||
				page.disabledSources.includes(type) ||
				(disabledSources.value.includes(type) && page.failedSources.includes(type)),
		);
	}

	function requestPage(state: InboxState, category?: InboxCategory) {
		return async (cursor?: string) =>
			await fetchInbox(rootStore.restApiContext, {
				state,
				category,
				limit: INBOX_PAGE_LIMIT,
				cursor,
			});
	}
	const lists = {
		waiting: createInboxListSlice(
			requestPage('open', 'waiting'),
			removeDisabledSources,
			reconcileSources,
		),
		// Authored does not query Assistant results, so absence says nothing about that source.
		authored: createInboxListSlice(requestPage('open', 'authored'), removeDisabledSources, (page) =>
			reconcileSources(page, true),
		),
		closed: createInboxListSlice(requestPage('closed'), removeDisabledSources, reconcileSources),
	};
	const activeSectionKeys = computed<InboxSectionKey[]>(() =>
		activeTab.value === 'closed' ? ['closed'] : ['waiting', 'authored'],
	);
	const activeLists = computed(() => activeSectionKeys.value.map((key) => lists[key]));
	const hasItems = computed(() => activeLists.value.some((list) => list.items.length > 0));
	const loading = computed(() => activeLists.value.some((list) => list.loading));
	const hasError = computed(() => activeLists.value.some((list) => list.error !== null));
	const partial = computed(() => activeLists.value.some((list) => list.partial));
	const isEmpty = computed(() =>
		activeLists.value.every(
			(list) =>
				list.hasLoaded &&
				!list.loading &&
				!list.error &&
				!list.partial &&
				!list.hasMore &&
				list.items.length === 0,
		),
	);

	async function fetchSummary() {
		if (!enabled.value) return;
		const seq = ++summaryRequestSeq;
		try {
			const summary = await fetchInboxSummary(rootStore.restApiContext);
			if (seq !== summaryRequestSeq) return;
			removeDisabledSources(summary.disabledSources);
			openCount.value = summary.counts?.open ?? null;
			closedCount.value = summary.counts?.closed ?? null;
		} catch (error) {
			if (seq !== summaryRequestSeq) return;
			removeDisabledSources(disabledTypesFromError(error));
		}
	}

	async function fetchActiveTab() {
		if (!enabled.value) return;
		await Promise.all(activeLists.value.map(async (list) => await list.fetchList()));
	}

	async function refreshListAndSummary() {
		await Promise.all([fetchActiveTab(), fetchSummary()]);
	}

	function reconcileItemChange(change: InboxItemChange) {
		for (const list of Object.values(lists)) {
			const item = list.items.find((row) => row.type === change.type && row.id === change.id);
			if (!item) continue;
			if (change.state) item.state = change.state;
			if (change.updatedAt) item.updatedAt = change.updatedAt;
			if (item.type === 'workflow_review' && change.decision) item.decision = change.decision;
			if (item.state !== activeTab.value) {
				list.items = list.items.filter((row) => row !== item);
			}
		}
		if (change.state === 'closed') {
			if (openCount.value !== null) openCount.value = Math.max(0, openCount.value - 1);
			if (closedCount.value !== null) closedCount.value++;
		}
	}

	async function setActiveTab(tab: InboxState) {
		if (activeTab.value === tab) return;
		activeTab.value = tab;
		await fetchActiveTab();
	}

	function reset() {
		summaryRequestSeq++;
		for (const list of Object.values(lists)) list.reset();
		openCount.value = null;
		closedCount.value = null;
		const settings = settingsStore.settings.inbox;
		const available = [...(settings?.availableTypes ?? []), ...(settings?.failedTypes ?? [])];
		disabledSources.value = sourceTypes.filter((type) => !available.includes(type));
	}

	return {
		lists,
		activeTab,
		activeSectionKeys,
		activeLists,
		hasItems,
		loading,
		hasError,
		partial,
		isEmpty,
		enabled,
		openCount,
		closedCount,
		disabledSources,
		fetchSummary,
		fetchActiveTab,
		refreshListAndSummary,
		reconcileItemChange,
		setActiveTab,
		reset,
	};
});
