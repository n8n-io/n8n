import type { LlmUsageCallsResponse, LlmUsageSummaryResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { fetchLlmUsageCalls, fetchLlmUsageSummary, type LlmUsageCallsPage } from './llm-usage.api';
import { CALLS_PAGE_SIZES, DEFAULT_RANGE_DAYS } from './llm-usage.constants';

export const useLlmUsageStore = defineStore('llmUsage', () => {
	const rootStore = useRootStore();
	const days = ref(DEFAULT_RANGE_DAYS);
	const summary = ref<LlmUsageSummaryResponse>();
	const calls = ref<LlmUsageCallsResponse>({ count: 0, items: [] });
	const callsQuery = ref<LlmUsageCallsPage>({
		skip: 0,
		take: CALLS_PAGE_SIZES[0],
		sortBy: 'finishedAt',
		sortOrder: 'desc',
	});
	const callsLoading = ref(false);

	// Only the latest request of each kind may change the state: an older response can arrive
	// after a newer one when the page or range changes quickly.
	let callsRequest = 0;
	let summaryRequest = 0;

	/** Merges `query` into the current calls query and loads that page. */
	async function fetchCalls(query: Partial<LlmUsageCallsPage> = {}) {
		callsQuery.value = { ...callsQuery.value, ...query };
		const request = ++callsRequest;
		callsLoading.value = true;
		try {
			const response = await fetchLlmUsageCalls(rootStore.restApiContext, {
				days: days.value,
				...callsQuery.value,
			});
			if (request === callsRequest) calls.value = response;
		} catch (error) {
			if (request === callsRequest) throw error;
		} finally {
			if (request === callsRequest) callsLoading.value = false;
		}
	}

	/**
	 * Loads the summary and the first page of calls for `rangeDays`. The range changes only when
	 * its summary loads, so the page never shows two ranges. A calls page that fails empties the
	 * table and does not hide the summary.
	 */
	async function fetchAll(rangeDays = days.value) {
		const request = ++summaryRequest;
		const pageRequest = ++callsRequest;
		const page = { ...callsQuery.value, skip: 0 };
		callsLoading.value = true;
		const [summaryResult, callsResult] = await Promise.allSettled([
			fetchLlmUsageSummary(rootStore.restApiContext, rangeDays),
			fetchLlmUsageCalls(rootStore.restApiContext, { days: rangeDays, ...page }),
		]);
		const latestPage = pageRequest === callsRequest;
		if (latestPage) callsLoading.value = false;
		if (request !== summaryRequest) return;
		if (summaryResult.status === 'rejected') throw summaryResult.reason;

		days.value = rangeDays;
		summary.value = summaryResult.value;
		if (!latestPage) return;
		callsQuery.value = page;
		if (callsResult.status === 'rejected') {
			calls.value = { count: 0, items: [] };
			throw callsResult.reason;
		}
		calls.value = callsResult.value;
	}

	return { days, summary, calls, callsQuery, callsLoading, fetchAll, fetchCalls };
});
