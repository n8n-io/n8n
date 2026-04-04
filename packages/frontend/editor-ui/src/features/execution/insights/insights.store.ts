import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useAsyncState } from '@vueuse/core';
import type { ListInsightsWorkflowQueryDto, InsightsDateFilterDto } from '@n8n/api-types';
import * as insightsApi from '@/features/execution/insights/insights.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { transformInsightsSummary } from '@/features/execution/insights/insights.utils';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

export const useInsightsStore = defineStore('insights', () => {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const projectsStore = useProjectsStore();

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

	const projectSummary = useAsyncState(
		async (projectId?: string) => {
			const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext, { projectId });
			return transformInsightsSummary(raw);
		},
		[],
		{ immediate: false, resetOnExecute: false },
	);

	async function fetchProjectSummary(projectId: string) {
		return await projectSummary.execute(0, projectId);
	}

	function hasProjectInsightsAccess(projectId: string): boolean {
		if (globalInsightsPermissions.value.list) return true;
		const project = projectsStore.myProjects.find((p) => p.id === projectId);
		return !!getResourcePermissions(project?.scopes).insights.list;
	}

	// True when the current user can see any insights at all — either via global
	// access (owner/admin) or via project-level access on at least one project.
	// Used by both the route guard and the dashboard component.
	const canViewInsights = computed(
		() =>
			isInsightsEnabled.value &&
			(globalInsightsPermissions.value.list ||
				projectsStore.myProjects.some((p) => hasProjectInsightsAccess(p.id))),
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

	return {
		globalInsightsPermissions,
		isInsightsEnabled,
		isSummaryEnabled,
		isDashboardEnabled,
		canViewInsights,
		weeklySummary,
		projectSummary,
		fetchProjectSummary,
		hasProjectInsightsAccess,
		summary,
		charts,
		table,
		dateRanges,
	};
});
