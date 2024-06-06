<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { RouteRecordName } from 'vue-router';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables/useI18n';
import { useProjectsStore } from '@/stores/projects.store';
import { getProjectPermissions } from '@/permissions';

const locale = useI18n();
const route = useRoute();

const projectsStore = useProjectsStore();

const selectedTab = ref<RouteRecordName | null | undefined>('');
const options = computed(() => {
	const projectId = route?.params?.projectId;
	const to = projectId
		? {
				workflows: {
					name: VIEWS.PROJECTS_WORKFLOWS,
					params: { projectId },
				},
				credentials: {
					name: VIEWS.PROJECTS_CREDENTIALS,
					params: { projectId },
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

	if (projectId && getProjectPermissions(projectsStore.currentProject).update) {
		tabs.push({
			label: locale.baseText('projects.settings'),
			value: VIEWS.PROJECT_SETTINGS,
			to: { name: VIEWS.PROJECT_SETTINGS, params: { projectId } },
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
		<N8nTabs v-model="selectedTab" :options="options" data-test-id="project-tabs" />
	</div>
</template>

<style module lang="scss">
.projectTabs {
	padding: var(--spacing-2xs) 0 var(--spacing-l);
}
</style>
