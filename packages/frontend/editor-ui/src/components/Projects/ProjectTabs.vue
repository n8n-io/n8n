<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { RouteRecordName } from 'vue-router';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { TabOptions } from '@n8n/design-system';
import { processDynamicTabs, type DynamicTabOptions } from '@/utils/modules/tabUtils';

import { N8nTabs } from '@n8n/design-system';
type Props = {
	showSettings?: boolean;
	showExecutions?: boolean;
	pageType?: 'overview' | 'shared' | 'project';
	additionalTabs?: DynamicTabOptions[];
};

const props = withDefaults(defineProps<Props>(), {
	showSettings: false,
	showExecutions: true,
	pageType: 'project',
	additionalTabs: () => [],
});

const locale = useI18n();
const route = useRoute();

const selectedTab = ref<RouteRecordName | null | undefined>('');

const selectedTabLabel = computed(() => (selectedTab.value ? String(selectedTab.value) : ''));

const projectId = computed(() => {
	return Array.isArray(route?.params?.projectId)
		? route.params.projectId[0]
		: route?.params?.projectId;
});

const getRouteConfigs = () => {
	// For project pages
	if (projectId.value) {
		return {
			workflows: {
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: projectId.value },
			},
			credentials: {
				name: VIEWS.PROJECTS_CREDENTIALS,
				params: { projectId: projectId.value },
			},
			executions: {
				name: VIEWS.PROJECTS_EXECUTIONS,
				params: { projectId: projectId.value },
			},
		};
	}

	// Shared with me
	if (props.pageType === 'shared') {
		return {
			workflows: { name: VIEWS.SHARED_WORKFLOWS },
			credentials: { name: VIEWS.SHARED_CREDENTIALS },
			executions: { name: VIEWS.NOT_FOUND },
		};
	}

	// Overview
	return {
		workflows: { name: VIEWS.WORKFLOWS },
		credentials: { name: VIEWS.CREDENTIALS },
		executions: { name: VIEWS.EXECUTIONS },
	};
};

// Create individual tab objects
const createTab = (
	label: BaseTextKey,
	routeKey: string,
	routes: Record<string, { name: RouteRecordName; params?: Record<string, string | number> }>,
): TabOptions<string> => {
	return {
		label: locale.baseText(label),
		value: routes[routeKey].name as string,
		to: routes[routeKey],
	};
};

// Generate the tabs configuration
const options = computed<Array<TabOptions<string>>>(() => {
	const routes = getRouteConfigs();
	const tabs = [
		createTab('mainSidebar.workflows', 'workflows', routes),
		createTab('mainSidebar.credentials', 'credentials', routes),
	];

	if (props.showExecutions) {
		tabs.push(createTab('mainSidebar.executions', 'executions', routes));
	}

	if (props.additionalTabs?.length) {
		const processedAdditionalTabs = processDynamicTabs(props.additionalTabs, projectId.value);
		tabs.push(...processedAdditionalTabs);
	}

	if (props.showSettings) {
		tabs.push({
			label: locale.baseText('projects.settings'),
			value: VIEWS.PROJECT_SETTINGS as string,
			to: { name: VIEWS.PROJECT_SETTINGS, params: { projectId: projectId.value } },
		});
	}

	return tabs;
});

watch(
	() => route?.name,
	() => {
		// Select workflows tab if folders tab is selected
		selectedTab.value =
			route.name === VIEWS.PROJECTS_FOLDERS ? VIEWS.PROJECTS_WORKFLOWS : route.name;
	},
	{ immediate: true },
);

function onSelectTab(value: string | number) {
	selectedTab.value = value as RouteRecordName;
}
</script>

<template>
	<N8nTabs
		:model-value="selectedTabLabel"
		:options="options"
		data-test-id="project-tabs"
		@update:model-value="onSelectTab"
	/>
</template>
