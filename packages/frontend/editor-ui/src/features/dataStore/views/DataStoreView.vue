<script setup lang="ts">
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useProjectPages } from '@/composables/useProjectPages';
import { useInsightsStore } from '@/features/insights/insights.store';

import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { ProjectTypes } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import { fetchDataStores } from '../api/datastore.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { DataStoreEntity } from '../datastore.types';
import type { DataStoreResource } from '@/Interface';
import DataStoreCard from '@/features/dataStore/components/DataStoreCard.vue';

const i18n = useI18n();
const projectPages = useProjectPages();

const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();
const rootStore = useRootStore();

const loading = ref(true);
const dataStores = ref<DataStoreResource[]>([]);

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
	return i18n.baseText('data.stores.empty.button.label', {
		interpolate: { projectName: projectName.value },
	});
});

async function initialize() {
	loading.value = true;
	const fetched: DataStoreEntity[] = await fetchDataStores(
		rootStore.restApiContext,
		projectName.value ?? undefined,
	);
	dataStores.value = fetched.map((item) => ({
		...item,
		resourceType: 'datastore',
	}));
	loading.value = false;
}
</script>
<template>
	<ResourcesListLayout
		ref="layout"
		resource-key="datastores"
		type="list-paginated"
		:resources="dataStores"
		:initialize="initialize"
		:type-props="{ itemSize: 77 }"
		:loading="loading"
		:disabled="false"
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
				:heading="i18n.baseText('data.store.empty.label')"
				:description="emptyCalloutDescription"
				:button-text="emptyCalloutButtonText"
				button-type="secondary"
			/>
		</template>
		<template #item="{ item: data }">
			<DataStoreCard :data-store="data as DataStoreResource" class="mb-2xs" />
		</template>
	</ResourcesListLayout>
</template>
