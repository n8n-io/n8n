<script setup lang="ts">
import ProjectHeader, { type CustomAction } from '@/components/Projects/ProjectHeader.vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useProjectPages } from '@/composables/useProjectPages';
import { useInsightsStore } from '@/features/insights/insights.store';

import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ProjectTypes } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import type { SortingAndPaginationUpdates } from '@/Interface';
import type { DataStoreResource } from '@/features/dataStore/types';
import DataStoreCard from '@/features/dataStore/components/DataStoreCard.vue';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import {
	ADD_DATA_STORE_MODAL_KEY,
	DEFAULT_DATA_STORE_PAGE_SIZE,
} from '@/features/dataStore/constants';
import { useDebounce } from '@/composables/useDebounce';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';

const i18n = useI18n();
const route = useRoute();
const projectPages = useProjectPages();
const { callDebounced } = useDebounce();
const documentTitle = useDocumentTitle();
const toast = useToast();

const dataStoreStore = useDataStoreStore();
const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();

const loading = ref(true);

const currentPage = ref(1);
const pageSize = ref(DEFAULT_DATA_STORE_PAGE_SIZE);

const customProjectActions = computed<CustomAction[]>(() => [
	{
		id: 'add-data-store',
		label: i18n.baseText('dataStore.add.button.label'),
		disabled: loading.value || projectPages.isOverviewSubPage,
	},
]);

const dataStoreResources = computed<DataStoreResource[]>(() =>
	dataStoreStore.dataStores.map((ds) => {
		return {
			...ds,
			resourceType: 'datastore',
		};
	}),
);

const totalCount = computed(() => dataStoreStore.totalCount);

const currentProject = computed(() => projectsStore.currentProject);

const projectName = computed(() => {
	if (currentProject.value?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return currentProject.value?.name;
});

const emptyCalloutDescription = computed(() => {
	return projectPages.isOverviewSubPage ? i18n.baseText('dataStore.empty.description') : '';
});

const emptyCalloutButtonText = computed(() => {
	if (projectPages.isOverviewSubPage || !projectName.value) {
		return '';
	}
	return i18n.baseText('dataStore.empty.button.label', {
		interpolate: { projectName: projectName.value },
	});
});

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

const initialize = async () => {
	loading.value = true;
	const projectId = Array.isArray(route.params.projectId)
		? route.params.projectId[0]
		: route.params.projectId;
	try {
		await dataStoreStore.fetchDataStores(projectId, currentPage.value, pageSize.value);
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
	useUIStore().openModal(ADD_DATA_STORE_MODAL_KEY);
};

const onProjectHeaderAction = (action: string) => {
	if (action === 'add-data-store') {
		useUIStore().openModal(ADD_DATA_STORE_MODAL_KEY);
	}
};

const onCardRename = async (payload: { dataStore: DataStoreResource }) => {
	try {
		const updated = await dataStoreStore.updateDataStore(
			payload.dataStore.id,
			payload.dataStore.name,
			payload.dataStore.projectId,
		);
		if (!updated) {
			toast.showError(
				new Error(i18n.baseText('generic.unknownError')),
				i18n.baseText('dataStore.rename.error'),
			);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.rename.error'));
	}
};

onMounted(() => {
	documentTitle.set(i18n.baseText('dataStore.dataStores'));
});
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
			<ProjectHeader
				:custom-actions="customProjectActions"
				@custom-action-selected="onProjectHeaderAction"
			>
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
				:description="emptyCalloutDescription"
				:button-text="emptyCalloutButtonText"
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
				@rename="onCardRename"
			/>
		</template>
	</ResourcesListLayout>
</template>
