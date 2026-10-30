<script setup lang="ts">
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { InsightsSummary, useInsightsStore } from '@n8n/frontend-module-insights';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import DataTableCard from '@/features/core/dataTable/components/DataTableCard.vue';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DEFAULT_DATA_TABLE_PAGE_SIZE,
	PROJECT_DATA_TABLES,
} from '@/features/core/dataTable/constants';
import { getDebounceTime, useDebounce } from '@n8n/composables/useDebounce';
import debounce from 'lodash/debounce';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTableResource } from '@/features/core/dataTable/types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { promotionEventBus } from '@/features/integrations/promotions.ee/promotions.eventBus';
import type { BaseFilters, SortingAndPaginationUpdates } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import {
	RESOURCE_LIST_COLUMN_WIDTH,
	type ResourceListColumn,
	useResourceListColumns,
} from '@/app/components/layouts/resourceListColumns';
import ResourcesListEmptyState from '@/app/components/layouts/ResourcesListEmptyState.vue';
import { DEBOUNCE_TIME } from '@/app/constants';
import { useDependencies } from '@/app/composables/useDependencies';
import { type BatchRange, useLoadMoreBatches } from '@/app/composables/useLoadMoreBatches';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const projectPages = useProjectPages();

const resourceListColumns = useResourceListColumns();

const listColumns = computed<ResourceListColumn[]>(() => [
	resourceListColumns.name(),
	{
		key: 'size',
		label: i18n.baseText('resourcesList.column.size'),
		width: RESOURCE_LIST_COLUMN_WIDTH.narrow,
		priority: 2,
	},
	{
		key: 'columns',
		label: i18n.baseText('resourcesList.column.columns'),
		width: RESOURCE_LIST_COLUMN_WIDTH.narrow,
		priority: 3,
	},
	...(projectPages.isOverviewSubPage ? [resourceListColumns.location()] : []),
	resourceListColumns.updated(),
	resourceListColumns.created(),
	resourceListColumns.dependencies(),
	resourceListColumns.actions(),
]);
const { callDebounced } = useDebounce();
const documentTitle = useDocumentTitle();
const toast = useToast();

const dataTableStore = useDataTableStore();
const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const uiStore = useUIStore();
const { fetchDependencyCounts } = useDependencies();

const loading = ref(true);

const batches = useLoadMoreBatches(DEFAULT_DATA_TABLE_PAGE_SIZE);

const SEARCH_DEBOUNCE_TIME = getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH);
// Sorting by size involves potentially expensive extra DB queries so we
// disallow defaulting to these values
const PERSIST_KEY_EXCLUSIONS = ['sizeAsc', 'sizeDesc'] satisfies Array<
	keyof typeof DATA_TABLE_SORT_MAP
>;

const filters = ref<BaseFilters>({
	search: '',
	homeProject: '',
});

const dataTableResources = computed<DataTableResource[]>(() =>
	dataTableStore.dataTables.map((ds) => {
		return {
			...ds,
			resourceType: 'dataTable',
		};
	}),
);

const totalCount = computed(() => dataTableStore.totalCount);

const currentProject = computed(() => {
	if (projectPages.isOverviewSubPage) {
		return projectsStore.personalProject;
	}
	return projectsStore.currentProject;
});

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

const addDataTableDisabled = computed(
	() => readOnlyEnv.value || !dataTableStore.projectPermissions.dataTable.create,
);

const addDataTableDisabledTooltip = computed(() =>
	readOnlyEnv.value
		? i18n.baseText('readOnlyEnv.cantAdd.any')
		: i18n.baseText('dataTable.empty.button.disabled.tooltip'),
);

const DATA_TABLE_SORT_MAP = {
	lastUpdated: 'updatedAt:desc',
	lastCreated: 'createdAt:desc',
	nameAsc: 'name:asc',
	nameDesc: 'name:desc',
	sizeAsc: 'size:asc',
	sizeDesc: 'size:desc',
} as const;
type SORT_TYPE = typeof DATA_TABLE_SORT_MAP;

const currentSort = ref<SORT_TYPE[keyof SORT_TYPE]>('updatedAt:desc');

const delayedLoading = debounce(() => {
	loading.value = true;
}, 300);

// The project, filters and sort of the current list
const getListQuery = () => ({
	projectId: (projectPages.isOverviewSubPage ? '' : projectsStore.currentProjectId) ?? '',
	filter: {
		name: filters.value.search === '' ? undefined : filters.value.search,
		projectId: filters.value.homeProject === '' ? undefined : filters.value.homeProject,
	},
	sortBy: currentSort.value,
});

const fetchDataTablesRange = async (range: BatchRange) => {
	const { projectId, filter, sortBy } = getListQuery();
	return await dataTableStore.fetchDataTablesRange(projectId, range, filter, sortBy);
};

const fetchDataTables = async () => {
	const range = batches.startRefresh();
	try {
		delayedLoading();
		const { projectId, filter, sortBy } = getListQuery();
		await dataTableStore.fetchDataTables(projectId, 1, range.take, filter, sortBy);
	} catch (error) {
		toast.showError(error, 'Error loading data tables');
	} finally {
		batches.endRefresh();
		delayedLoading.cancel();
		loading.value = false;

		const dataTableIds = dataTableStore.dataTables.map((dt) => dt.id);
		void fetchDependencyCounts(dataTableIds, 'dataTable');
	}
};

const loadMoreDataTables = async () => {
	try {
		await batches.loadMore(dataTableStore.dataTables.length, fetchDataTablesRange, (response) => {
			const newTables = dataTableStore.appendDataTables(response);
			if (newTables.length > 0) {
				void fetchDependencyCounts(
					newTables.map((dt) => dt.id),
					'dataTable',
				);
			}
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('resourcesList.loadMore.error'));
	}
};

const onPaginationUpdate = async (payload: SortingAndPaginationUpdates) => {
	if (payload.sort) {
		batches.reset();
		currentSort.value =
			DATA_TABLE_SORT_MAP[payload.sort as keyof typeof DATA_TABLE_SORT_MAP] ?? 'updatedAt:desc';
	}

	if (!loading.value) {
		await callDebounced(fetchDataTables, { debounceTime: 200, trailing: true });
	}
};

const onAddModalClick = () => {
	void router.push({
		name: PROJECT_DATA_TABLES,
		params: { projectId: currentProject.value?.id, new: 'new' },
	});
};

const onSearchUpdated = async (search: string) => {
	batches.reset();
	filters.value.search = search;

	if (search) {
		await callDebounced(fetchDataTables, { debounceTime: SEARCH_DEBOUNCE_TIME, trailing: true });
	} else {
		// No need to debounce when clearing search
		await fetchDataTables();
	}
};

onMounted(() => {
	documentTitle.set(i18n.baseText('dataTable.dataTables'));
	promotionEventBus.on('applied', fetchDataTables);
});

onBeforeUnmount(() => {
	promotionEventBus.off('applied', fetchDataTables);
});

// The /new route can be opened directly, so apply the same checks as the create button.
// Permissions can change after the project loads, so watch the result, not only the route.
const shouldOpenCreateModal = computed(
	() => route.params.new === 'new' && !addDataTableDisabled.value,
);

watch(
	shouldOpenCreateModal,
	(open) => {
		if (open) {
			uiStore.openModal(ADD_DATA_TABLE_MODAL_KEY);
		} else {
			uiStore.closeModal(ADD_DATA_TABLE_MODAL_KEY);
		}
	},
	{ immediate: true },
);
</script>
<template>
	<ResourcesListLayout
		ref="layout"
		resource-key="dataTable"
		type="list-paginated"
		:resources="dataTableResources"
		:initialize="fetchDataTables"
		:type-props="{ itemSize: 80 }"
		:list-columns="listColumns"
		:loading="false"
		:disabled="false"
		:total-items="totalCount"
		:custom-page-size="DEFAULT_DATA_TABLE_PAGE_SIZE"
		:resources-refreshing="loading"
		:sort-options="Object.keys(DATA_TABLE_SORT_MAP)"
		:dont-perform-sorting-and-filtering="true"
		:ui-config="{
			searchEnabled: true,
			showFiltersDropdown: false,
			sortEnabled: true,
		}"
		tab-key="dataTable"
		:persist-key-exclusions="PERSIST_KEY_EXCLUSIONS"
		@update:search="onSearchUpdated"
		@update:pagination-and-sort="onPaginationUpdate"
		@load-more="loadMoreDataTables"
	>
		<template #header>
			<ProjectHeader main-button="dataTable">
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
				resource-key="dataTable"
				:button-disabled="addDataTableDisabled"
				:disabled-tooltip-text="addDataTableDisabled ? addDataTableDisabledTooltip : undefined"
				@click:button="onAddModalClick"
			/>
		</template>
		<template #item="{ item: data }">
			<DataTableCard
				:data-table="data as DataTableResource"
				:show-ownership-badge="projectPages.isOverviewSubPage"
				:schema-read-only="readOnlyEnv"
			/>
		</template>
	</ResourcesListLayout>
</template>
