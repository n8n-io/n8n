import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useAsyncState } from '@vueuse/core';
import type { ListInsightsWorkflowQueryDto, InsightsDateRange } from '@n8n/api-types';
import * as insightsApi from '@/features/insights/insights.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { transformInsightsSummary } from '@/features/insights/insights.utils';
import { getResourcePermissions } from '@n8n/permissions';

export const useInsightsStore = defineStore('insights', () => {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();

	const globalInsightsPermissions = computed(
		() => getResourcePermissions(usersStore.currentUser?.globalScopes).insights,
	);

	const isInsightsEnabled = computed(() => settingsStore.isModuleActive('insights'));

	const isDashboardEnabled = computed(() => !!settingsStore.moduleSettings.insights?.dashboard);

	const isSummaryEnabled = computed(
		() => globalInsightsPermissions.value.list && isInsightsEnabled.value,
	);

	const weeklySummary = useAsyncState(
		async () => {
			const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext, {
				dateRange: 'week',
			});
			return transformInsightsSummary(raw);
		},
		[],
		{ immediate: false, resetOnExecute: false },
	);

	const summary = useAsyncState(
		async (filter?: { dateRange: InsightsDateRange['key'] }) => {
			const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext, filter);
			return transformInsightsSummary(raw);
		},
		[],
		{ immediate: false, resetOnExecute: false },
	);

	const charts = useAsyncState(
		async (filter?: { dateRange: InsightsDateRange['key'] }) => {
			const dataFetcher = isDashboardEnabled.value
				? insightsApi.fetchInsightsByTime
				: insightsApi.fetchInsightsTimeSaved;
			return await dataFetcher(rootStore.restApiContext, filter);
		},
		[],
		{ immediate: false, resetOnExecute: false },
	);

	const table = useAsyncState(
		async (filter?: ListInsightsWorkflowQueryDto) => {
			return await insightsApi.fetchInsightsByWorkflow(rootStore.restApiContext, filter);
		},
		{
			count: 0,
			data: [],
		},
		{ immediate: false, resetOnExecute: false },
	);

	const dateRanges = computed(() => settingsStore.moduleSettings.insights?.dateRanges ?? []);

	return {
		globalInsightsPermissions,
		isInsightsEnabled,
		isSummaryEnabled,
		isDashboardEnabled,
		weeklySummary,
		summary,
		charts,
		table,
		dateRanges,
	};
});
