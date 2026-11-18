<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { RouteRecordName } from 'vue-router';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { TabOptions } from '@n8n/design-system';
import type { DynamicTabOptions } from '@n8n/frontend-module-sdk';
import { processDynamicTabs } from '@/app/utils/modules/tabUtils';

import { N8nTabs } from '@n8n/design-system';
import { useProjectsStore } from '../projects.store';
import { ProjectTypes } from '../projects.types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useIsPageModuleActive } from '@/features/pages/composables/useIsPageModuleActive';
import {
	DOCUMENTATION_OVERVIEW_MODE,
	OVERVIEW_MODE_QUERY_PARAMETER,
} from '@/features/pages/composables/useOverviewMode';

/** The value of the tab that shows the documentation board. It is not a route name. */
const DOCUMENTATION_TAB = 'documentation';
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
const projectStore = useProjectsStore();
const telemetry = useTelemetry();
const isPageModuleActive = useIsPageModuleActive();

const selectedTab = ref<RouteRecordName | null | undefined>('');

const selectedTabLabel = computed(() => (selectedTab.value ? String(selectedTab.value) : ''));

const projectId = computed(() => {
	return Array.isArray(route?.params?.projectId)
		? route.params.projectId[0]
		: route?.params?.projectId;
});

const WORKFLOW_LIST_ROUTES: RouteRecordName[] = [VIEWS.WORKFLOWS, VIEWS.PROJECTS_WORKFLOWS];

/** True when the open view is the documentation board, which shares the route of the workflow list. */
const isDocumentationOpen = computed(
	() =>
		route.name !== null &&
		route.name !== undefined &&
		WORKFLOW_LIST_ROUTES.includes(route.name) &&
		route.query?.[OVERVIEW_MODE_QUERY_PARAMETER] === DOCUMENTATION_OVERVIEW_MODE,
);

/** The documentation board has no meaning for the workflows that other users shared. */
const showsDocumentationTab = computed(
	() => props.pageType !== 'shared' && isPageModuleActive.value,
);

const isPublicProject = computed(() => projectStore.currentProject?.type === ProjectTypes.Public);

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
			variables: {
				name: VIEWS.PROJECTS_VARIABLES,
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
			variables: { name: VIEWS.NOT_FOUND },
		};
	}

	// Overview
	return {
		workflows: { name: VIEWS.WORKFLOWS },
		credentials: { name: VIEWS.CREDENTIALS },
		executions: { name: VIEWS.EXECUTIONS },
		variables: { name: VIEWS.HOME_VARIABLES },
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
	const documentationTabs: Array<TabOptions<string>> = showsDocumentationTab.value
		? [
				{
					label: locale.baseText('page.overview.tab'),
					value: DOCUMENTATION_TAB,
					to: {
						...routes.workflows,
						query: { [OVERVIEW_MODE_QUERY_PARAMETER]: DOCUMENTATION_OVERVIEW_MODE },
					},
				},
			]
		: [];
	const tabs = [
		...documentationTabs,
		createTab('mainSidebar.workflows', 'workflows', routes),
		createTab('mainSidebar.credentials', 'credentials', routes),
	];

	if (props.showExecutions) {
		tabs.push(createTab('mainSidebar.executions', 'executions', routes));
	}

	// Optimistic while currentProject loads — hiding the tab until the fetch
	// resolves would shift the tab strip on every overview → project navigation
	if (props.pageType === 'overview' || (props.pageType === 'project' && !isPublicProject.value)) {
		tabs.push(createTab('mainSidebar.variables', 'variables', routes));
	}

	if (props.additionalTabs?.length) {
		const processedAdditionalTabs = processDynamicTabs(props.additionalTabs, projectId.value);
		for (const processed of processedAdditionalTabs) {
			const { insertAfter, ...tab } = processed;
			const anchorIndex = insertAfter ? tabs.findIndex((t) => t.value === insertAfter) : -1;
			if (anchorIndex !== -1) {
				tabs.splice(anchorIndex + 1, 0, tab);
			} else {
				tabs.push(tab);
			}
		}
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
	[() => route?.name, isDocumentationOpen],
	() => {
		if (isDocumentationOpen.value) {
			selectedTab.value = DOCUMENTATION_TAB;
		} else {
			// Select workflows tab if folders tab is selected
			selectedTab.value =
				route.name === VIEWS.PROJECTS_FOLDERS ? VIEWS.PROJECTS_WORKFLOWS : route.name;
		}
	},
	{ immediate: true },
);

function onSelectTab(value: string | number) {
	if (selectedTab.value === 'variables') {
		telemetry.track('User clicked project variables tab', {
			project_id: projectId.value,
		});
	}
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
