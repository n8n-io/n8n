<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { RouteRecordName } from 'vue-router';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { useProjectsStore } from '@/features/projects/projects.store';

const locale = useI18n();
const route = useRoute();
const projectsStore = useProjectsStore();

const selectedTab = ref<RouteRecordName | null | undefined>('');
const options = computed(() => {
	const to = projectsStore.isProjectRoute
		? {
				workflows: {
					name: VIEWS.PROJECTS_WORKFLOWS,
					params: { projectId: projectsStore.currentProject?.id },
				},
				credentials: {
					name: VIEWS.PROJECTS_CREDENTIALS,
					params: { projectId: projectsStore.currentProject?.id },
				},
		  }
		: {
				workflows: {
					name: VIEWS.WORKFLOWS,
				},
				credentials: {
					name: VIEWS.CREDENTIALS,
				},
		  };
	const tabs = [
		{
			label: locale.baseText('mainSidebar.workflows'),
			value: to.workflows.name,
			to: to.workflows,
		},
		{
			label: locale.baseText('mainSidebar.credentials'),
			value: to.credentials.name,
			to: to.credentials,
		},
	];

	if (projectsStore.isProjectRoute) {
		tabs.push({
			label: locale.baseText('settings'),
			value: VIEWS.PROJECT_SETTINGS,
			to: { name: VIEWS.PROJECT_SETTINGS, params: { projectId: projectsStore.currentProject?.id } },
		});
	}

	return tabs;
});
watch(
	() => route?.name,
	() => {
		selectedTab.value = route?.name;
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.projectTabs">
		<n8n-tabs v-model="selectedTab" :options="options" />
	</div>
</template>

<style module lang="scss">
.projectTabs {
	padding: var(--spacing-m) 0 var(--spacing-2xl);
}
</style>
