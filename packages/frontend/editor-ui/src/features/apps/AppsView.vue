<script setup lang="ts">
import type { AppsListSortBy } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime, useDebounce } from '@n8n/composables/useDebounce';
import { getResourcePermissions } from '@n8n/permissions';
import debounce from 'lodash/debounce';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import TimeAgo from '@/app/components/TimeAgo.vue';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import ResourcesListEmptyState from '@/app/components/layouts/ResourcesListEmptyState.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { DEBOUNCE_TIME, DEFAULT_WORKFLOW_PAGE_SIZE } from '@/app/constants';
import type { BaseFilters, SortingAndPaginationUpdates } from '@/Interface';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { InsightsSummary, useInsightsStore } from '@/features/execution/insights';
import { useAppsStore } from '@/features/apps/apps.store';
import { APP_DETAILS, APP_NEW } from '@/features/apps/apps.constants';
import type { App } from '@/features/apps/apps.types';
import { useAppDeletion } from '@/features/apps/useAppDeletion';

const APPS_SORT_MAP: Record<string, AppsListSortBy> = {
	lastUpdated: 'updatedAt:desc',
	lastCreated: 'createdAt:desc',
	nameAsc: 'name:asc',
	nameDesc: 'name:desc',
};

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { callDebounced } = useDebounce();
const { confirmAndDeleteApp } = useAppDeletion();

const projectPages = useProjectPages();
const projectsStore = useProjectsStore();
const insightsStore = useInsightsStore();
const appsStore = useAppsStore();

const filters = ref<BaseFilters>({ search: '', homeProject: '' });
const currentPage = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
const currentSort = ref<AppsListSortBy>('updatedAt:desc');
const loading = ref(true);

// The overview has no project in the route; the list then spans every project.
const listProjectId = computed(() =>
	projectPages.isOverviewSubPage ? undefined : projectsStore.currentProjectId,
);
const createProjectId = computed(
	() => listProjectId.value ?? projectsStore.personalProject?.id ?? '',
);
const canCreate = computed(
	() =>
		!!getResourcePermissions(
			(listProjectId.value ? projectsStore.currentProject : projectsStore.personalProject)?.scopes,
		).app.create,
);

const isApp = (value: unknown): value is App =>
	typeof value === 'object' && value !== null && 'namespace' in value;

async function fetchApps() {
	const delayedLoading = debounce(() => {
		loading.value = true;
	}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
	if (appsStore.apps.length > 0) delayedLoading();
	else loading.value = true;

	try {
		await appsStore.fetchApps(listProjectId.value, {
			skip: (currentPage.value - 1) * pageSize.value,
			take: pageSize.value,
			sortBy: currentSort.value,
			name: filters.value.search || undefined,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.getDetails.error'));
	} finally {
		delayedLoading.cancel();
		loading.value = false;
	}
}

async function onSearchUpdated(search: string) {
	filters.value = { ...filters.value, search };
	currentPage.value = 1;
	if (search) {
		await callDebounced(fetchApps, { debounceTime: DEBOUNCE_TIME.INPUT.SEARCH, trailing: true });
	} else {
		await fetchApps();
	}
}

async function onPaginationAndSort(payload: SortingAndPaginationUpdates) {
	if (payload.page) currentPage.value = payload.page;
	if (payload.pageSize) pageSize.value = payload.pageSize;
	if (payload.sort) currentSort.value = APPS_SORT_MAP[payload.sort] ?? 'updatedAt:desc';
	if (!loading.value) {
		await callDebounced(fetchApps, {
			debounceTime: DEBOUNCE_TIME.API.RESOURCE_SEARCH,
			trailing: true,
		});
	}
}

const openNewApp = async () => {
	await router.push({ name: APP_NEW, params: { projectId: createProjectId.value } });
};

const openApp = async (app: App) => {
	await router.push({ name: APP_DETAILS, params: { projectId: app.projectId, appId: app.id } });
};

async function onDelete(app: App) {
	if (!(await confirmAndDeleteApp(app.projectId, app))) return;
	if (appsStore.apps.length === 0 && currentPage.value > 1) currentPage.value -= 1;
	await fetchApps();
}

onMounted(() => {
	documentTitle.set(i18n.baseText('apps.apps'));
});
</script>

<template>
	<ResourcesListLayout
		v-model:filters="filters"
		resource-key="apps"
		type="list-paginated"
		:resources="appsStore.apps"
		:initialize="fetchApps"
		:loading="false"
		:resources-refreshing="loading"
		:disabled="false"
		:sort-options="Object.keys(APPS_SORT_MAP)"
		:type-props="{ itemSize: 80 }"
		:custom-page-size="DEFAULT_WORKFLOW_PAGE_SIZE"
		:total-items="appsStore.appsCount"
		:dont-perform-sorting-and-filtering="true"
		:shareable="false"
		:ui-config="{ searchEnabled: true, showFiltersDropdown: false, sortEnabled: true }"
		tab-key="apps"
		data-test-id="apps-view"
		@update:search="onSearchUpdated"
		@update:pagination-and-sort="onPaginationAndSort"
	>
		<template #header>
			<ProjectHeader main-button="app">
				<InsightsSummary
					v-if="projectPages.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>

		<template #empty>
			<ResourcesListEmptyState
				resource-key="apps"
				:button-disabled="!canCreate"
				@click:button="openNewApp"
			/>
		</template>

		<template #item="{ item }">
			<N8nCard
				v-if="isApp(item)"
				hoverable
				class="mb-2xs"
				:class="$style.appCard"
				data-test-id="app-card"
				@click="openApp(item)"
			>
				<template #prepend>
					<N8nIcon icon="app-window" />
				</template>
				<N8nText bold>{{ item.name }}</N8nText>
				<N8nText color="text-light" size="small">
					/{{ item.namespace }} | {{ i18n.baseText('apps.card.updated') }}
					<TimeAgo :date="item.updatedAt" />
				</N8nText>
				<template #append>
					<N8nButton
						icon-only
						icon="trash-2"
						variant="subtle"
						:aria-label="i18n.baseText('generic.delete')"
						data-test-id="app-delete"
						@click.stop="onDelete(item)"
					/>
				</template>
			</N8nCard>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.appCard {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
}
</style>
