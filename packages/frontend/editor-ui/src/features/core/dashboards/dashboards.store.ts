import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { hasPermission } from '@/app/utils/rbac/permissions';

import { DASHBOARDS_STORE } from '@/features/core/dashboards/constants';
import {
	createDashboardApi,
	deleteDashboardApi,
	fetchDashboardApi,
	fetchDashboardsApi,
	updateDashboardApi,
} from '@/features/core/dashboards/dashboards.api';
import type {
	Dashboard,
	DashboardListItem,
	DashboardSpec,
} from '@/features/core/dashboards/dashboards.types';
import { migrateSpec } from '@/features/core/dashboards/utils/migrateSpec';

export const useDashboardsStore = defineStore(DASHBOARDS_STORE, () => {
	const rootStore = useRootStore();

	const dashboards = ref<DashboardListItem[]>([]);
	const totalCount = ref(0);
	const activeDashboard = ref<Dashboard | null>(null);
	const loading = ref(false);

	const canViewDashboards = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'dashboard:list' } }),
	);

	async function fetchDashboards(
		projectId: string,
		options?: { skip?: number; take?: number; archived?: boolean },
	) {
		loading.value = true;
		try {
			const response = await fetchDashboardsApi(rootStore.restApiContext, projectId, {
				skip: options?.skip,
				take: options?.take,
				filter: { archived: options?.archived },
			});
			dashboards.value = response.data;
			totalCount.value = response.count;
		} finally {
			loading.value = false;
		}
	}

	async function fetchDashboard(projectId: string, dashboardId: string) {
		loading.value = true;
		try {
			const fetched = await fetchDashboardApi(rootStore.restApiContext, projectId, dashboardId);
			// Normalize legacy flat specs into v2 (views[]) so all UI code can assume the new shape.
			activeDashboard.value = { ...fetched, spec: migrateSpec(fetched.spec) as DashboardSpec };
			return activeDashboard.value;
		} finally {
			loading.value = false;
		}
	}

	async function createDashboard(
		projectId: string,
		payload: { name: string; description?: string; spec: DashboardSpec; tags?: string[] },
	) {
		const created = await createDashboardApi(rootStore.restApiContext, projectId, payload);
		dashboards.value = [
			{
				id: created.id,
				name: created.name,
				description: created.description ?? null,
				projectId: created.projectId,
				tags: created.tags,
				archived: created.archived,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt,
			},
			...dashboards.value,
		];
		return created;
	}

	async function updateDashboard(
		projectId: string,
		dashboardId: string,
		payload: Partial<{
			name: string;
			description: string | null;
			spec: DashboardSpec;
			tags: string[];
			archived: boolean;
		}>,
	) {
		// Optimistic concurrency: pass the active version so the backend can
		// reject a stale write with 409 Conflict. Frontend should catch and
		// prompt the user to refresh.
		const expectedVersion =
			activeDashboard.value?.id === dashboardId ? activeDashboard.value.version : undefined;

		let updated;
		try {
			updated = await updateDashboardApi(rootStore.restApiContext, projectId, dashboardId, {
				...payload,
				expectedVersion,
			});
		} catch (err) {
			const status =
				(err as { httpStatusCode?: number }).httpStatusCode ?? (err as { status?: number }).status;
			if (status === 409) {
				await fetchDashboard(projectId, dashboardId);
				throw new Error(
					'Dashboard was modified elsewhere — latest version reloaded. Please re-apply your change.',
				);
			}
			throw err;
		}
		if (activeDashboard.value?.id === dashboardId) {
			activeDashboard.value = { ...activeDashboard.value, ...updated };
		}
		const idx = dashboards.value.findIndex((d) => d.id === dashboardId);
		if (idx >= 0) {
			dashboards.value[idx] = {
				...dashboards.value[idx],
				name: updated.name,
				description: updated.description ?? null,
				tags: updated.tags,
				archived: updated.archived,
				updatedAt: updated.updatedAt,
			};
		}
		return updated;
	}

	async function deleteDashboard(projectId: string, dashboardId: string) {
		await deleteDashboardApi(rootStore.restApiContext, projectId, dashboardId);
		dashboards.value = dashboards.value.filter((d) => d.id !== dashboardId);
		if (activeDashboard.value?.id === dashboardId) {
			activeDashboard.value = null;
		}
	}

	function setActiveDashboard(dashboard: Dashboard | null) {
		activeDashboard.value = dashboard;
	}

	return {
		dashboards,
		totalCount,
		activeDashboard,
		loading,
		canViewDashboards,
		fetchDashboards,
		fetchDashboard,
		createDashboard,
		updateDashboard,
		deleteDashboard,
		setActiveDashboard,
	};
});
