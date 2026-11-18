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
// Prototype: project settings navigation.
import { isSettingsPage } from '@/features/projectSettingsPrototype/nav/model';
import {
	PROTO_MEMBERS_VIEW,
	PROTO_SETTINGS_PAGE_VIEW,
	useProtoChrome,
} from '@/features/projectSettingsPrototype/nav/useProtoChrome';
import { protoParams } from '@/features/projectSettingsPrototype/params';
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
const proto = useProtoChrome();

const selectedTab = ref<RouteRecordName | null | undefined>('');

const selectedTabLabel = computed(() => (selectedTab.value ? String(selectedTab.value) : ''));

const projectId = computed(() => {
	return Array.isArray(route?.params?.projectId)
		? route.params.projectId[0]
		: route?.params?.projectId;
});

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
	const tabs = [
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

	// Prototype: Members can be a tab of its own, and the variant decides where settings open.
	const nav = proto.nav.value;
	const members = nav?.resources.find((item) => item.id === 'members');
	if (members) {
		tabs.push({ label: members.label, value: PROTO_MEMBERS_VIEW, to: members.to });
	}

	const settingsEntry = nav?.settingsFlat[0];
	if (props.showSettings && settingsEntry && !proto.settingsInMenu.value) {
		tabs.push({
			label: locale.baseText('projects.settings'),
			value: VIEWS.PROJECT_SETTINGS as string,
			to:
				protoParams.variant === 'baseline'
					? { name: VIEWS.PROJECT_SETTINGS, params: { projectId: projectId.value } }
					: settingsEntry.to,
		});
	}

	return tabs;
});

watch(
	() => [route?.name, proto.page.value, protoParams.membersPlacement, protoParams.variant],
	() => {
		// Prototype: a settings page selects the settings tab, wherever Members is placed.
		if (route.name === PROTO_SETTINGS_PAGE_VIEW || route.name === PROTO_MEMBERS_VIEW) {
			const page = proto.page.value;
			selectedTab.value =
				page && isSettingsPage(page, protoParams) ? VIEWS.PROJECT_SETTINGS : PROTO_MEMBERS_VIEW;
			return;
		}
		// Select workflows tab if folders tab is selected
		selectedTab.value =
			route.name === VIEWS.PROJECTS_FOLDERS ? VIEWS.PROJECTS_WORKFLOWS : route.name;
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
