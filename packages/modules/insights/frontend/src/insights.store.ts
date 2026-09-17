import type { ListInsightsWorkflowQueryDto, InsightsDateFilterDto } from '@n8n/api-types';
import { getResourcePermissions } from '@n8n/permissions';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { useAsyncState } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';

import * as insightsApi from './insights.api';
import { transformInsightsSummary } from './insights.utils';

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
			const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext);
			return transformInsightsSummary(raw);
		},
		[],
		{ immediate: false, resetOnExecute: false },
	);

	const summary = useAsyncState(
		async (filter?: InsightsDateFilterDto) => {
			const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext, filter);
			return transformInsightsSummary(raw);
		},
		[],
		{ immediate: false, resetOnExecute: false },
	);

	const charts = useAsyncState(
		async (filter?: InsightsDateFilterDto) => {
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

	const earliestDataDate = computed(
		() => settingsStore.moduleSettings.insights?.earliestDataDate ?? null,
	);

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
		earliestDataDate,
	};
});
