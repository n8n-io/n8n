<script setup lang="ts">
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useProjectPages } from '@/composables/useProjectPages';
import { useInsightsStore } from '@/features/insights/insights.store';

import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ProjectTypes } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import { fetchDataStores } from '@/features/dataStore/datastore.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { IUser, SortingAndPaginationUpdates, UserAction } from '@/Interface';
import type { DataStoreResource } from '@/features/dataStore/types';
import DataStoreCard from '@/features/dataStore/components/DataStoreCard.vue';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import {
	DATA_STORE_CARD_ACTIONS,
	DEFAULT_DATA_STORE_PAGE_SIZE,
} from '@/features/dataStore/constants';
import { useDebounce } from '@/composables/useDebounce';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useToast } from '@/composables/useToast';

const i18n = useI18n();
const route = useRoute();
const projectPages = useProjectPages();
const { callDebounced } = useDebounce();
const documentTitle = useDocumentTitle();
const toast = useToast();

const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();
const rootStore = useRootStore();
const sourceControlStore = useSourceControlStore();

const loading = ref(true);
const dataStores = ref<DataStoreResource[]>([]);
const totalCount = ref(0);

const currentPage = ref(1);
const pageSize = ref(DEFAULT_DATA_STORE_PAGE_SIZE);

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

const cardActions = computed<Array<UserAction<IUser>>>(() => [
	{
		label: i18n.baseText('generic.rename'),
		value: DATA_STORE_CARD_ACTIONS.RENAME,
		disabled: readOnlyEnv.value,
	},
	{
		label: i18n.baseText('generic.delete'),
		value: DATA_STORE_CARD_ACTIONS.DELETE,
		disabled: readOnlyEnv.value,
	},
	{
		label: i18n.baseText('generic.clear'),
		value: DATA_STORE_CARD_ACTIONS.CLEAR,
		disabled: readOnlyEnv.value,
	},
]);

const initialize = async () => {
	loading.value = true;
	const projectId = Array.isArray(route.params.projectId)
		? route.params.projectId[0]
		: route.params.projectId;
	try {
		const response = await fetchDataStores(rootStore.restApiContext, projectId, {
			page: currentPage.value,
			pageSize: pageSize.value,
		});
		dataStores.value = response.data.map((item) => ({
			...item,
			resourceType: 'datastore',
		}));
		totalCount.value = response.count;
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

onMounted(() => {
	documentTitle.set(i18n.baseText('dataStore.tab.label'));
});
</script>
<template>
	<ResourcesListLayout
		ref="layout"
		resource-key="dataStore"
		type="list-paginated"
		:resources="dataStores"
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
				:description="emptyCalloutDescription"
				:button-text="emptyCalloutButtonText"
				button-type="secondary"
			/>
		</template>
		<template #item="{ item: data }">
			<DataStoreCard
				class="mb-2xs"
				:data-store="data as DataStoreResource"
				:show-ownership-badge="projectPages.isOverviewSubPage"
				:actions="cardActions"
				:read-only="readOnlyEnv"
			/>
		</template>
	</ResourcesListLayout>
</template>
