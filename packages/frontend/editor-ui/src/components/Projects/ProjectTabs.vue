<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { RouteRecordName } from 'vue-router';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables/useI18n';

type Props = {
	showSettings?: boolean;
	showExecutions?: boolean;
	pageType?: 'overview' | 'shared' | 'project';
};

const props = withDefaults(defineProps<Props>(), {
	showSettings: true,
	showExecutions: true,
	pageType: 'project',
});

const locale = useI18n();
const route = useRoute();

const selectedTab = ref<RouteRecordName | null | undefined>('');
const options = computed(() => {
	const projectId = route?.params?.projectId;
	let to = {
		workflows: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId },
		},
		credentials: {
			name: VIEWS.PROJECTS_CREDENTIALS,
			params: { projectId },
		},
		executions: {
			name: VIEWS.PROJECTS_EXECUTIONS,
			params: { projectId },
		},
	};

	if (props.pageType === 'overview') {
		to = {
			workflows: {
				name: VIEWS.WORKFLOWS,
				params: { projectId },
			},
			credentials: {
				name: VIEWS.CREDENTIALS,
				params: { projectId },
			},
			executions: {
				name: VIEWS.EXECUTIONS,
				params: { projectId },
			},
		};
	}

	if (props.pageType === 'shared') {
		to = {
			workflows: {
				name: VIEWS.SHARED_WORKFLOWS,
				params: { projectId: '' },
			},
			credentials: {
				name: VIEWS.SHARED_CREDENTIALS,
				params: { projectId: '' },
			},
			executions: {
				name: VIEWS.NOT_FOUND,
				params: { projectId: '' },
			},
		};
	}
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

	if (props.showExecutions) {
		tabs.push({
			label: locale.baseText('mainSidebar.executions'),
			value: to.executions.name,
			to: to.executions,
		});
	}

	if (props.showSettings) {
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
		// Select workflows tab if folders tab is selected
		selectedTab.value =
			route.name === VIEWS.PROJECTS_FOLDERS ? VIEWS.PROJECTS_WORKFLOWS : route.name;
	},
	{ immediate: true },
);
</script>

<template>
	<N8nTabs v-model="selectedTab" :options="options" data-test-id="project-tabs" />
</template>
