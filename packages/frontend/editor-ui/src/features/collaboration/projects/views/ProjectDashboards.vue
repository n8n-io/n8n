<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { PageViewLayout } from '@/app/components/layouts';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { useProjectsStore } from '../projects.store';
import { useDashboardsStore } from '../dashboards/dashboards.store';
import { N8nButton, N8nIconButton, N8nText } from '@n8n/design-system';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const overview = useProjectPages();
const insightsStore = useInsightsStore();
const dashboardsStore = useDashboardsStore();
const projectsStore = useProjectsStore();

const routeProjectId = computed(() => {
	const id = route.params.projectId;
	return Array.isArray(id) ? id[0] : (id as string | undefined);
});

const effectiveProjectId = computed(
	() => routeProjectId.value ?? projectsStore.personalProject?.id,
);

const isProjectRoute = computed(() => !!routeProjectId.value);

const dashboards = computed(() => {
	if (!effectiveProjectId.value) return [];
	return dashboardsStore.getByProjectId(effectiveProjectId.value);
});

function detailRoute(dashboardId: string) {
	if (isProjectRoute.value) {
		return {
			name: VIEWS.PROJECTS_DASHBOARD_DETAIL,
			params: { projectId: routeProjectId.value, dashboardId },
		};
	}
	return {
		name: VIEWS.HOME_DASHBOARD_DETAIL,
		params: { dashboardId },
	};
}

function createAndOpen() {
	if (!effectiveProjectId.value) return;
	const dashboard = dashboardsStore.create(effectiveProjectId.value);
	void router.push(detailRoute(dashboard.id));
}

function openDashboard(id: string) {
	void router.push(detailRoute(id));
}

function deleteDashboard(id: string) {
	dashboardsStore.remove(id);
}

onMounted(() => {
	useDocumentTitle().set(i18n.baseText('mainSidebar.dashboards'));
});
</script>

<template>
	<PageViewLayout>
		<template #header>
			<ProjectHeader>
				<InsightsSummary
					v-if="overview.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>

		<!-- Empty state -->
		<div v-if="dashboards.length === 0" :class="$style.empty">
			<N8nButton size="large" data-test-id="create-dashboard-button" @click="createAndOpen">
				Create a new dashboard
			</N8nButton>
		</div>

		<!-- Dashboard list -->
		<div v-else :class="$style.list">
			<div :class="$style.listHeader">
				<N8nButton size="small" data-test-id="create-dashboard-button" @click="createAndOpen">
					Create a new dashboard
				</N8nButton>
			</div>
			<div
				v-for="dashboard in dashboards"
				:key="dashboard.id"
				:class="$style.row"
				data-test-id="dashboard-list-item"
				@click="openDashboard(dashboard.id)"
			>
				<N8nText bold>{{ dashboard.name }}</N8nText>
				<N8nIconButton
					icon="trash-2"
					variant="ghost"
					size="small"
					data-test-id="dashboard-delete-button"
					@click.stop="deleteDashboard(dashboard.id)"
				/>
			</div>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.listHeader {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: background-color 0.15s ease;

	&:hover {
		background-color: var(--color--background--shade-1);
	}
}
</style>
