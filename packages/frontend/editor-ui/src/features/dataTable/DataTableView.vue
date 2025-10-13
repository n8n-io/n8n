<script setup lang="ts">
import ProjectHeader from '@/features/projects/components/ProjectHeader.vue';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useProjectPages } from '@/features/projects/composables/useProjectPages';
import { useInsightsStore } from '@/features/insights/insights.store';

import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { SortingAndPaginationUpdates } from '@/Interface';
import type { DataTableResource } from '@/features/dataTable/types';
import DataTableCard from '@/features/dataTable/components/DataTableCard.vue';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DEFAULT_DATA_TABLE_PAGE_SIZE,
	PROJECT_DATA_TABLES,
} from '@/features/dataTable/constants';
import { useDebounce } from '@/composables/useDebounce';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';

import { N8nActionBox } from '@n8n/design-system';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';

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

const initialize = async () => {
	loading.value = true;
	const projectIdFilter = projectPages.isOverviewSubPage ? '' : projectsStore.currentProjectId;
	try {
		await dataTableStore.fetchDataTables(projectIdFilter ?? '', currentPage.value, pageSize.value);
	} catch (error) {
		toast.showError(error, 'Error loading data tables');
	} finally {
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
	if (!loading.value) {
		await callDebounced(initialize, { debounceTime: 200, trailing: true });
	}
};

const onAddModalClick = () => {
	void router.push({
		name: PROJECT_DATA_TABLES,
		params: { projectId: currentProject.value?.id, new: 'new' },
	});
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
		:initialize="initialize"
		:type-props="{ itemSize: 80 }"
		:loading="loading"
		:disabled="false"
		:total-items="totalCount"
		:dont-perform-sorting-and-filtering="true"
		:ui-config="{
			searchEnabled: false,
			showFiltersDropdown: false,
			sortEnabled: false,
		}"
		@update:pagination-and-sort="onPaginationUpdate"
	>
		<template #header>
			<ProjectHeader>
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
				@click:button="onAddModalClick"
			/>
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
