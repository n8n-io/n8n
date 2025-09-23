<script setup lang="ts">
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useProjectPages } from '@/composables/useProjectPages';
import { useInsightsStore } from '@/features/insights/insights.store';

import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectsStore } from '@/stores/projects.store';
import type { SortingAndPaginationUpdates } from '@/Interface';
import type { DataStoreResource } from '@/features/dataStore/types';
import DataStoreCard from '@/features/dataStore/components/DataStoreCard.vue';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import {
	ADD_DATA_STORE_MODAL_KEY,
	DEFAULT_DATA_STORE_PAGE_SIZE,
	PROJECT_DATA_STORES,
} from '@/features/dataStore/constants';
import { useDebounce } from '@/composables/useDebounce';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const projectPages = useProjectPages();
const { callDebounced } = useDebounce();
const documentTitle = useDocumentTitle();
const toast = useToast();

const dataStoreStore = useDataStoreStore();
const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const uiStore = useUIStore();

const loading = ref(true);

const currentPage = ref(1);
const pageSize = ref(DEFAULT_DATA_STORE_PAGE_SIZE);

const dataStoreResources = computed<DataStoreResource[]>(() =>
	dataStoreStore.dataStores.map((ds) => {
		return {
			...ds,
			resourceType: 'datastore',
		};
	}),
);

const totalCount = computed(() => dataStoreStore.totalCount);

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
		await dataStoreStore.fetchDataStores(projectIdFilter ?? '', currentPage.value, pageSize.value);
	} catch (error) {
		toast.showError(error, 'Error loading data stores');
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
		name: PROJECT_DATA_STORES,
		params: { projectId: currentProject.value?.id, new: 'new' },
	});
};

onMounted(() => {
	documentTitle.set(i18n.baseText('dataStore.dataStores'));
});

watch(
	() => route.params.new,
	() => {
		if (route.params.new === 'new') {
			uiStore.openModal(ADD_DATA_STORE_MODAL_KEY);
		} else {
			uiStore.closeModal(ADD_DATA_STORE_MODAL_KEY);
		}
	},
	{ immediate: true },
);
</script>
<template>
	<ResourcesListLayout
		ref="layout"
		resource-key="dataStore"
		type="list-paginated"
		:resources="dataStoreResources"
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
			<n8n-action-box
				data-test-id="empty-shared-action-box"
				:heading="i18n.baseText('dataStore.empty.label')"
				:description="i18n.baseText('dataStore.empty.description')"
				:button-text="i18n.baseText('dataStore.add.button.label')"
				button-type="secondary"
				@click:button="onAddModalClick"
			/>
		</template>
		<template #item="{ item: data }">
			<DataStoreCard
				class="mb-2xs"
				:data-store="data as DataStoreResource"
				:show-ownership-badge="projectPages.isOverviewSubPage"
				:read-only="readOnlyEnv"
			/>
		</template>
	</ResourcesListLayout>
</template>
