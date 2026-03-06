<script setup lang="ts">
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import DataTableCard from '@/features/core/dataTable/components/DataTableCard.vue';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DEFAULT_DATA_TABLE_PAGE_SIZE,
	PROJECT_DATA_TABLES,
} from '@/features/core/dataTable/constants';
import { useDebounce } from '@/app/composables/useDebounce';
import debounce from 'lodash/debounce';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTableResource } from '@/features/core/dataTable/types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { BaseFilters, SortingAndPaginationUpdates } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { N8nActionBox } from '@n8n/design-system';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const projectPages = useProjectPages();
const { callDebounced } = useDebounce();
const documentTitle = useDocumentTitle();
const toast = useToast();

const dataTableStore = useDataTableStore();
const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const uiStore = useUIStore();

const loading = ref(true);

const currentPage = ref(1);
const pageSize = ref(DEFAULT_DATA_TABLE_PAGE_SIZE);

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

const fetchDataTables = async () => {
	const projectIdFilter = projectPages.isOverviewSubPage ? '' : projectsStore.currentProjectId;
	try {
		delayedLoading();
		await dataTableStore.fetchDataTables(
			projectIdFilter ?? '',
			currentPage.value,
			pageSize.value,
			{
				name: filters.value.search === '' ? undefined : filters.value.search,
				projectId: filters.value.homeProject === '' ? undefined : filters.value.homeProject,
			},
			currentSort.value,
		);
	} catch (error) {
		toast.showError(error, 'Error loading data tables');
	} finally {
		delayedLoading.cancel();
		loading.value = false;
	}
};

const onPaginationUpdate = async (payload: SortingAndPaginationUpdates) => {
	if (payload.page) {
		currentPage.value = payload.page;
	}
	if (payload.pageSize) {
		pageSize.value = payload.pageSize;
	}
	if (payload.sort) {
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
	currentPage.value = 1;
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
});

watch(
	() => route.params.new,
	() => {
		if (route.params.new === 'new') {
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
		:loading="false"
		:disabled="false"
		:total-items="totalCount"
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
			<N8nActionBox
				data-test-id="empty-data-table-action-box"
				:heading="i18n.baseText('dataTable.empty.label')"
				:description="i18n.baseText('dataTable.empty.description')"
				:button-text="i18n.baseText('dataTable.add.button.label')"
				button-type="secondary"
				:button-disabled="!dataTableStore.projectPermissions.dataTable.create"
				:button-icon="!dataTableStore.projectPermissions.dataTable.create ? 'lock' : undefined"
				@click:button="onAddModalClick"
			>
				<template #disabledButtonTooltip>
					{{ i18n.baseText('dataTable.empty.button.disabled.tooltip') }}
				</template>
			</N8nActionBox>
		</template>
		<template #item="{ item: data }">
			<DataTableCard
				class="mb-2xs"
				:data-table="data as DataTableResource"
				:show-ownership-badge="projectPages.isOverviewSubPage"
				:read-only="readOnlyEnv"
			/>
		</template>
	</ResourcesListLayout>
</template>
