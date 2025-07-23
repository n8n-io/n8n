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

const i18n = useI18n();
const projectPages = useProjectPages();

const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();

const loading = ref(false);

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
	await Promise.resolve();
}
</script>
<template>
	<ResourcesListLayout
		ref="layout"
		resource-key="datastores"
		:resources="[]"
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
	</ResourcesListLayout>
</template>
