<script setup lang="ts">
import { computed, defineAsyncComponent, inject, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useElementSize, useResizeObserver } from '@vueuse/core';
import type { TabOptions, UserAction } from '@n8n/design-system';
import type { SlotProjectHeaderMainButton, SlotProjectHeaderProps } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { ProjectTypes } from '../projects.types';
import { useProjectsStore } from '../projects.store';
import { canConfigureSelfHealing, selfHealingLocation } from '../projects.utils';
import ProjectTabs from './ProjectTabs.vue';
import { useAppNavigation } from '@/app/components/appNavigation/useAppNavigation';
import { ResourceListToolbarTargetKey } from '@/app/components/layouts/resourceListToolbar';
import ProjectIcon from './ProjectIcon.vue';
import { getResourcePermissions } from '@n8n/permissions';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import ProjectCreateResource from './ProjectCreateResource.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { truncateTextToFitWidth } from '@/app/utils/formatters/textFormatter';
import { type IconName } from '@n8n/design-system';
import type { IUser } from 'n8n-workflow';
import { type IconOrEmoji, isIconOrEmoji } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import { PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import {
	PERSONAL_SELF_HEALING_VIEW,
	PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
} from '@n8n/frontend-constants/self-healing';
import { useAgentPermissions } from '@/features/agents/composables/useAgentPermissions';
import ReadyToRunButton from '@/features/workflows/readyToRun/components/ReadyToRunButton.vue';
import { loadPromotionPreviewBadges } from '@n8n/frontend-module-promotions';

import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useCreateAgent } from '@/features/agents/composables/useCreateAgent';
import { PROJECT_AGENTS } from '@/features/agents/constants';
import { useUsersStore } from '@n8n/stores/users.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useCreateApp } from '@n8n/frontend-module-apps';

// Lazy, so the badges and their preview code stay out of the boot chunk.
const PromotionPreviewBadges = defineAsyncComponent(loadPromotionPreviewBadges);

// A list page puts its search, sort and filters at the end of the tab row
const setListToolbarTarget = inject(ResourceListToolbarTargetKey, undefined);
const onListToolbarTargetRef = (element: unknown) => {
	setListToolbarTarget?.(element instanceof HTMLElement ? element : null);
};

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const { createAgent } = useCreateAgent();
const { createApp } = useCreateApp();
const usersStore = useUsersStore();
const favoritesStore = useFavoritesStore();

const currentProjectId = computed(() => projectsStore.currentProject?.id);

const isTeamProject = computed(() => projectsStore.currentProject?.type === ProjectTypes.Team);

const isProjectFavorited = computed(() =>
	currentProjectId.value ? favoritesStore.isFavorite(currentProjectId.value, 'project') : false,
);

async function onToggleProjectFavorite() {
	if (!currentProjectId.value) return;
	await favoritesStore.toggleFavorite(currentProjectId.value, 'project');
}

const projectPages = useProjectPages();

const props = defineProps<SlotProjectHeaderProps>();

const emit = defineEmits<{
	createFolder: [];
}>();

const headerIcon = computed((): IconOrEmoji => {
	if (projectsStore.currentProject?.type === ProjectTypes.Personal) {
		return { type: 'icon', value: 'user' };
	} else if (projectsStore.currentProject?.name) {
		return isIconOrEmoji(projectsStore.currentProject.icon)
			? projectsStore.currentProject.icon
			: { type: 'icon', value: 'layers' };
	} else {
		return { type: 'icon', value: 'house' };
	}
});

const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

const { canCreate: canCreateAgent } = useAgentPermissions(() => homeProject.value?.id);

const isPersonalProject = computed(() => {
	return homeProject.value?.type === ProjectTypes.Personal;
});

const projectName = computed(() => {
	if (!projectsStore.currentProject) {
		if (projectPages.isSharedSubPage) {
			return i18n.baseText('projects.header.shared.title');
		} else if (projectPages.isOverviewSubPage) {
			return i18n.baseText('projects.menu.overview');
		} else if (isPersonalProject.value) {
			return i18n.baseText('projects.menu.personal');
		}
		return null;
	} else if (projectsStore.currentProject.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	} else {
		return projectsStore.currentProject.name;
	}
});

const projectPermissions = computed(
	() => getResourcePermissions(projectsStore.currentProject?.scopes).project,
);
const projectVariablePermissions = computed(
	() => getResourcePermissions(projectsStore.currentProject?.scopes).projectVariable,
);
const globalVariablesPermissions = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).variable,
);

const externalSecretsProviderPermissions = computed(
	() => getResourcePermissions(projectsStore.currentProject?.scopes).externalSecretsProvider,
);

const showSettings = computed(
	() =>
		!!route?.params?.projectId &&
		// Each section of the settings page is entered by its own scope, so any one
		// of them is enough to reach the page.
		(!!projectPermissions.value.update ||
			!!projectPermissions.value.manageMembers ||
			!!externalSecretsProviderPermissions.value.read) &&
		projectsStore.currentProject?.type === ProjectTypes.Team,
);

const showFolders = computed(() => {
	return (
		settingsStore.isFoldersFeatureEnabled &&
		[VIEWS.PROJECTS_WORKFLOWS, VIEWS.PROJECTS_FOLDERS, PROJECT_AGENTS].includes(String(route.name))
	);
});

const pageType = computed(() => {
	if (projectPages.isSharedSubPage) {
		return 'shared';
	} else if (projectPages.isOverviewSubPage) {
		return 'overview';
	} else {
		return 'project';
	}
});

// The navigation panel lists the pages of Overview and of each project, so only the shared
// pages, which the panel does not list, keep the tabs.
const showTabs = computed(() => pageType.value === 'shared');

// While the navigation panel is collapsed, the title shows the path to the page, such as
// "Monetization > Credentials", so the user still sees which page is open.
const navigation = useAppNavigation();
const currentPage = computed(() =>
	navigation
		.sectionsFor(navigation.activeItemId.value)
		.flatMap((section) => section.links)
		.find((link) => link.active),
);
const pathRoot = computed(() => navigation.railItemById(navigation.activeItemId.value));
const showPagePath = computed(
	() =>
		(uiStore.sidebarMenuCollapsed ?? false) &&
		!showTabs.value &&
		currentPage.value !== undefined &&
		pathRoot.value !== undefined,
);
// While the panel is open, its header names the project, so the title names the page.
const pageTitle = computed(() =>
	!(uiStore.sidebarMenuCollapsed ?? false) && !showTabs.value ? currentPage.value?.label : undefined,
);

const personalSelfHealingTab = computed((): TabOptions<string> | null => {
	const project = projectsStore.currentProject;
	if (
		pageType.value !== 'project' ||
		!project ||
		project.id !== route?.params?.projectId ||
		selfHealingLocation(project) !== 'personalTab' ||
		!canConfigureSelfHealing(project)
	) {
		return null;
	}
	return {
		label: i18n.baseText('selfHealing.config.heading'),
		value: PERSONAL_SELF_HEALING_VIEW,
		preview: true,
		to: { name: PERSONAL_SELF_HEALING_VIEW, params: { projectId: project.id } },
	};
});

const customProjectTabs = computed((): Array<TabOptions<string>> => {
	// Only pick up tabs from active modules
	const moduleTabs = uiStore.moduleTabs[pageType.value];
	const activeModules = Object.keys(moduleTabs).filter(
		(module) =>
			settingsStore.isModuleActive(module) &&
			(module !== 'agents' || settingsStore.isAgentsEnabled),
	);
	const tabs = activeModules.flatMap((module) => moduleTabs[module]);
	return personalSelfHealingTab.value ? [...tabs, personalSelfHealingTab.value] : tabs;
});

const ACTION_TYPES = {
	WORKFLOW: 'workflow',
	CREDENTIAL: 'credential',
	FOLDER: 'folder',
	DATA_TABLE: 'dataTable',
	VARIABLE: 'variable',
	AGENT: 'agent',
	APP: 'app',
	SELF_HEALING: 'selfHealing',
} as const satisfies Record<string, SlotProjectHeaderMainButton | 'folder'>;
type ActionTypes = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

const createWorkflowButton = computed(() => ({
	value: ACTION_TYPES.WORKFLOW,
	label: i18n.baseText('projects.menu.create.workflow'),
	icon: sourceControlStore.preferences.branchReadOnly ? ('lock' as IconName) : undefined,
	size: 'mini' as const,
	disabled:
		sourceControlStore.preferences.branchReadOnly ||
		!getResourcePermissions(homeProject.value?.scopes).workflow.create,
}));

const createCredentialButton = computed(() => ({
	value: ACTION_TYPES.CREDENTIAL,
	label: i18n.baseText('projects.menu.create.credential'),
	icon: sourceControlStore.preferences.branchReadOnly ? ('lock' as IconName) : undefined,
	size: 'mini' as const,
	disabled:
		sourceControlStore.preferences.branchReadOnly ||
		!getResourcePermissions(homeProject.value?.scopes).credential.create,
}));

const createDataTableButton = computed(() => ({
	value: ACTION_TYPES.DATA_TABLE,
	label: i18n.baseText('projects.menu.create.dataTable'),
	icon: sourceControlStore.preferences.branchReadOnly ? ('lock' as IconName) : undefined,
	size: 'mini' as const,
	disabled:
		sourceControlStore.preferences.branchReadOnly ||
		!getResourcePermissions(homeProject.value?.scopes)?.dataTable?.create,
}));

const createVariableButton = computed(() => ({
	value: ACTION_TYPES.VARIABLE,
	label: i18n.baseText('projects.menu.create.variable'),
	icon: sourceControlStore.preferences.branchReadOnly ? ('lock' as IconName) : undefined,
	size: 'mini' as const,
	disabled:
		sourceControlStore.preferences.branchReadOnly ||
		!settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables] ||
		(!projectVariablePermissions.value.create && !globalVariablesPermissions.value.create),
}));

const createAgentButton = computed(() => ({
	value: ACTION_TYPES.AGENT,
	label: i18n.baseText('projects.menu.create.agent'),
	size: 'mini' as const,
	disabled: !canCreateAgent.value,
}));

const canCreateApp = computed(
	() =>
		settingsStore.isAppsEnabled &&
		!sourceControlStore.preferences.branchReadOnly &&
		Boolean(getResourcePermissions(homeProject.value?.scopes).app?.create),
);
const createAppButton = computed(() => ({
	value: ACTION_TYPES.APP,
	label: i18n.baseText('projects.header.create.app'),
	size: 'mini' as const,
	disabled: !canCreateApp.value,
}));

const createSelfHealingButton = computed(() => ({
	value: ACTION_TYPES.SELF_HEALING,
	label: i18n.baseText('selfHealing.config.create'),
	icon: sourceControlStore.preferences.branchReadOnly ? ('lock' as IconName) : undefined,
	size: 'mini' as const,
	disabled: sourceControlStore.preferences.branchReadOnly || !personalSelfHealingTab.value,
}));

const selectedMainButtonType = computed(() => {
	if (props.mainButton === ACTION_TYPES.AGENT && !settingsStore.isAgentsEnabled) {
		return ACTION_TYPES.WORKFLOW;
	}
	if (props.mainButton === ACTION_TYPES.APP && !settingsStore.isAppsEnabled) {
		return ACTION_TYPES.WORKFLOW;
	}
	return props.mainButton ?? ACTION_TYPES.WORKFLOW;
});

const mainButtonConfig = computed(() => {
	switch (selectedMainButtonType.value) {
		case ACTION_TYPES.CREDENTIAL:
			return createCredentialButton.value;
		case ACTION_TYPES.DATA_TABLE:
			return createDataTableButton.value;
		case ACTION_TYPES.VARIABLE:
			return createVariableButton.value;
		case ACTION_TYPES.SELF_HEALING:
			return createSelfHealingButton.value;
		case ACTION_TYPES.AGENT:
			return createAgentButton.value;
		case ACTION_TYPES.APP:
			return createAppButton.value;
		case ACTION_TYPES.WORKFLOW:
		default:
			return createWorkflowButton.value;
	}
});

const menu = computed(() => {
	const items: Array<UserAction<IUser>> = [];

	// Add workflow to menu if it's not the main button
	if (selectedMainButtonType.value !== ACTION_TYPES.WORKFLOW) {
		items.push({
			value: ACTION_TYPES.WORKFLOW,
			label: i18n.baseText('projects.menu.create.workflow'),
			disabled:
				sourceControlStore.preferences.branchReadOnly ||
				!getResourcePermissions(homeProject.value?.scopes).workflow.create,
		});
	}

	// Add credential to menu if it's not the main button
	if (selectedMainButtonType.value !== ACTION_TYPES.CREDENTIAL) {
		items.push({
			value: ACTION_TYPES.CREDENTIAL,
			label: i18n.baseText('projects.menu.create.credential'),
			disabled:
				sourceControlStore.preferences.branchReadOnly ||
				!getResourcePermissions(homeProject.value?.scopes).credential.create,
		});
	}

	if (
		selectedMainButtonType.value !== ACTION_TYPES.VARIABLE &&
		settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]
	) {
		items.push({
			value: ACTION_TYPES.VARIABLE,
			label: i18n.baseText('projects.menu.create.variable'),
			disabled:
				sourceControlStore.preferences.branchReadOnly ||
				!getResourcePermissions(homeProject.value?.scopes).projectVariable.create,
		});
	}

	if (showFolders.value) {
		items.push({
			value: ACTION_TYPES.FOLDER,
			label: i18n.baseText('projects.menu.create.folder'),
			disabled:
				sourceControlStore.preferences.branchReadOnly ||
				!getResourcePermissions(homeProject.value?.scopes).folder.create,
		});
	}

	if (
		settingsStore.isDataTableFeatureEnabled &&
		selectedMainButtonType.value !== ACTION_TYPES.DATA_TABLE
	) {
		// TODO: this should probably be moved to the module descriptor as a setting
		items.push({
			value: ACTION_TYPES.DATA_TABLE,
			label: i18n.baseText('projects.menu.create.dataTable'),
			disabled:
				sourceControlStore.preferences.branchReadOnly ||
				!getResourcePermissions(homeProject.value?.scopes)?.dataTable?.create,
		});
	}

	if (settingsStore.isAgentsEnabled && selectedMainButtonType.value !== ACTION_TYPES.AGENT) {
		items.push({
			value: ACTION_TYPES.AGENT,
			label: i18n.baseText('projects.menu.create.agent'),
			disabled: !canCreateAgent.value,
		});
	}

	if (settingsStore.isAppsEnabled && selectedMainButtonType.value !== ACTION_TYPES.APP) {
		items.push({
			value: ACTION_TYPES.APP,
			label: i18n.baseText('projects.header.create.app'),
			disabled: !canCreateApp.value,
		});
	}

	return items;
});

const showProjectIcon = computed(() => {
	return (
		!pageTitle.value &&
		!projectPages.isOverviewSubPage &&
		!projectPages.isSharedSubPage &&
		!isPersonalProject.value
	);
});

function isCredentialsListView(routeName: string) {
	const CREDENTIAL_VIEWS: string[] = [
		VIEWS.PROJECTS_CREDENTIALS,
		VIEWS.CREDENTIALS,
		VIEWS.SHARED_CREDENTIALS,
	];

	return CREDENTIAL_VIEWS.includes(routeName);
}

function isWorkflowListView(routeName: string) {
	const WORKFLOWS_VIEWS: string[] = [
		VIEWS.PROJECTS_WORKFLOWS,
		VIEWS.WORKFLOWS,
		VIEWS.SHARED_WORKFLOWS,
		VIEWS.PROJECTS_FOLDERS,
	];

	return WORKFLOWS_VIEWS.includes(routeName);
}

function getUIContext(routeName: string) {
	if (isCredentialsListView(routeName)) {
		return 'credentials_list';
	} else if (isWorkflowListView(routeName)) {
		return 'workflow_list';
	} else {
		return;
	}
}

type CreateSource = 'button' | 'dropdown';

const actions: Record<ActionTypes, (projectId: string, source: CreateSource) => void> = {
	[ACTION_TYPES.WORKFLOW]: (projectId: string) => {
		void router.push({
			name: VIEWS.NEW_WORKFLOW,
			query: {
				projectId,
				parentFolderId: route.params.folderId as string,
				uiContext: getUIContext(route.name?.toString() ?? ''),
			},
		});
	},
	[ACTION_TYPES.CREDENTIAL]: (projectId: string) => {
		void router.push({
			name: VIEWS.PROJECTS_CREDENTIALS,
			params: {
				projectId,
				credentialId: 'create',
			},
			query: {
				uiContext: getUIContext(route.name?.toString() ?? ''),
			},
		});
	},
	[ACTION_TYPES.FOLDER]: () => {
		emit('createFolder');
	},
	[ACTION_TYPES.DATA_TABLE]: (projectId: string) => {
		void router.push({
			name: PROJECT_DATA_TABLES,
			params: { projectId, new: 'new' },
		});
	},
	[ACTION_TYPES.VARIABLE]: () => {
		uiStore.openModalWithData({ name: VARIABLE_MODAL_KEY, data: { mode: 'new' } });
		telemetry.track('User clicked header add variable button');
	},
	[ACTION_TYPES.SELF_HEALING]: (projectId) => {
		void router.push({
			name: PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
			params: { projectId, configurationId: 'new' },
		});
	},
	[ACTION_TYPES.AGENT]: (projectId, source) => {
		createAgent(source, projectId);
	},
	[ACTION_TYPES.APP]: (projectId) => {
		createApp(projectId);
	},
} as const;

const projectDescription = computed(() => {
	if (projectPages.isProjectsSubPage) {
		return projectsStore.currentProject?.description;
	}

	return null;
});

const favoriteIcon = computed(() => (isProjectFavorited.value ? 'star-filled' : 'star'));

const projectHeaderRef = ref<HTMLElement | null>(null);
const projectInfoRef = ref<HTMLElement | null>(null);
const { width: projectInfoWidth } = useElementSize(projectInfoRef);

const projectSubtitleFontSizeInPxs = ref<number | null>(null);

useResizeObserver(projectHeaderRef, () => {
	if (!projectHeaderRef.value) {
		return;
	}

	const projectSubtitleEl = projectHeaderRef.value.querySelector(
		'span[data-test-id="project-subtitle"]',
	);
	if (projectSubtitleEl) {
		const computedStyle = window.getComputedStyle(projectSubtitleEl);
		projectSubtitleFontSizeInPxs.value = parseFloat(computedStyle.fontSize);
	}
});

const projectDescriptionTruncated = computed(() => {
	if (!projectDescription.value) {
		return '';
	}

	// Fallback to N8nText component default font-size, small
	const fontSizeInPixels = projectSubtitleFontSizeInPxs.value ?? 14;
	return truncateTextToFitWidth(projectDescription.value, projectInfoWidth.value, fontSizeInPixels);
});

const onSelect = (action: string, source: CreateSource) => {
	const executableAction = actions[action as ActionTypes];
	if (!homeProject.value) {
		return;
	}

	executableAction(homeProject.value.id, source);
};
</script>

<template>
	<div>
		<div ref="projectHeaderRef" :class="$style.projectHeader">
			<div :class="$style.projectDetails">
				<ProjectIcon v-if="showProjectIcon" :icon="headerIcon" :border-less="true" size="medium" />
				<div ref="projectInfoRef" :class="$style.projectInfo">
					<div :class="$style.titleRow">
						<nav
							v-if="showPagePath && projectName && pathRoot && currentPage"
							:class="$style.pagePath"
							:aria-label="i18n.baseText('projects.header.pagePath')"
							data-test-id="project-page-path"
						>
							<RouterLink
								:to="pathRoot.to"
								:class="$style.pagePathRoot"
								:title="projectName"
								data-test-id="project-name"
							>
								{{ projectName }}
							</RouterLink>
							<N8nIcon icon="chevron-right-12" :size="12" :class="$style.pagePathSeparator" />
							<N8nHeading
								:class="$style.projectName"
								:title="currentPage.label"
								bold
								tag="h2"
								size="xlarge"
								aria-current="page"
								data-test-id="project-page-name"
								>{{ currentPage.label }}</N8nHeading
							>
						</nav>
						<N8nHeading
							v-else-if="pageTitle"
							:class="$style.projectName"
							:title="pageTitle"
							bold
							tag="h2"
							size="xlarge"
							data-test-id="project-page-name"
							>{{ pageTitle }}</N8nHeading
						>
						<N8nHeading
							v-else-if="projectName"
							:class="$style.projectName"
							:title="projectName"
							bold
							tag="h2"
							size="xlarge"
							data-test-id="project-name"
							>{{ projectName }}</N8nHeading
						>
						<!-- The star belongs to the project, so it shows only next to the project name. -->
						<N8nIconButton
							v-if="isTeamProject && !pageTitle"
							:class="[$style.favoriteBtn, isProjectFavorited && $style.favoriteBtnActive]"
							:icon="favoriteIcon"
							:aria-label="i18n.baseText(isProjectFavorited ? 'favorites.remove' : 'favorites.add')"
							variant="ghost"
							size="medium"
							data-test-id="project-favorite-btn"
							@click.stop="onToggleProjectFavorite"
						/>
						<PromotionPreviewBadges :class="$style.promotionBadges" />
					</div>
					<div v-if="projectDescription && !pageTitle" :class="$style.projectDescriptionWrapper">
						<N8nText :class="$style.descriptionText" color="text-light" data-test-id="project-subtitle">
							{{ projectDescriptionTruncated || projectDescription }}
						</N8nText>
						<div v-if="projectDescriptionTruncated" :class="$style.tooltip">
							<N8nText color="text-light">{{ projectDescription }}</N8nText>
						</div>
					</div>
				</div>
			</div>
			<div v-if="route.name !== VIEWS.PROJECT_SETTINGS" :class="[$style.headerActions]">
				<N8nTooltip
					:disabled="!sourceControlStore.preferences.branchReadOnly"
					:content="i18n.baseText('readOnlyEnv.cantAdd.any')"
				>
					<div style="display: flex; gap: var(--spacing--xs); align-items: center">
						<!-- Without tabs, the list search, sort and filter sit before the main button. -->
						<div
							v-if="setListToolbarTarget && !showTabs"
							:ref="onListToolbarTargetRef"
							:class="[$style.listToolbar, $style.listToolbarInHeader]"
							data-test-id="project-header-list-toolbar"
						/>
						<ReadyToRunButton :has-active-callouts="props.hasActiveCallouts" />
						<ProjectCreateResource
							data-test-id="add-resource-buttons"
							:actions="menu"
							variant="brand"
							:disabled="sourceControlStore.preferences.branchReadOnly"
							@action="(action: string) => onSelect(action, 'dropdown')"
						>
							<N8nButton
								:data-test-id="`add-resource-${selectedMainButtonType}`"
								v-bind="mainButtonConfig"
								size="medium"
								variant="brand"
								@click="onSelect(selectedMainButtonType, 'button')"
							/>
						</ProjectCreateResource>
					</div>
				</N8nTooltip>
			</div>
		</div>
		<slot></slot>
		<div v-if="showTabs" :class="$style.actions">
			<ProjectTabs
				:class="$style.tabs"
				:page-type="pageType"
				:show-executions="!projectPages.isSharedSubPage"
				:show-settings="showSettings"
				:additional-tabs="customProjectTabs"
			/>
			<div
				v-if="setListToolbarTarget"
				:ref="onListToolbarTargetRef"
				:class="$style.listToolbar"
				data-test-id="project-header-list-toolbar"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.projectHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--spacing--2xl);
}

.projectDetails {
	display: flex;
	align-items: flex-start;
	flex: 1;
	min-width: 0;
}

.projectInfo {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	gap: var(--spacing--4xs);
}

.projectName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.promotionBadges {
	flex-shrink: 0;
}

.actions {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--sm);
	// Reserve the list toolbar height, so the row keeps its size on tabs without
	// the toolbar and while a list page remounts on a tab change
	min-height: calc(var(--height--md) + var(--spacing--3xs));
	margin: var(--spacing--2xs) 0 var(--spacing--xs);
	// A hairline under the whole tab row; the active tab underline paints over it.
	box-shadow: inset 0 calc(-1 * var(--border-width, 1px)) 0 var(--border-color);

	:global(.n8n-tabs) {
		--tabs--tab--padding-bottom: var(--spacing--xs);
	}

	// Bottom-align the tabs so every underline lands on the hairline.
	:global(.n8n-tabs [role='tablist']) {
		align-items: flex-end;
	}

	// The badge is taller than a label. Trim it to the label height so its tab label stays in line.
	:global(.n8n-tabs [role='tablist'] .n8n-badge) {
		margin-block: calc(var(--spacing--3xs) / -2);
	}
}

// The tab row pads the toolbar to sit above its hairline; next to the main button it needs none.
.listToolbar.listToolbarInHeader {
	padding-bottom: 0;
}

.tabs {
	flex: 1;
	min-width: 0;
}

// Center the controls on the tab labels, above the hairline
.listToolbar {
	display: flex;
	align-items: center;
	padding-bottom: var(--spacing--3xs);

	&:empty {
		display: none;
	}
}

.projectDescriptionWrapper {
	position: relative;

	&:hover .tooltip {
		display: block;
	}
}

.descriptionText {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tooltip {
	display: none;
	position: absolute;
	top: 0;
	left: calc(-1 * var(--spacing--3xs));
	background-color: var(--color--background--light-2);
	padding: 0 var(--spacing--3xs) var(--spacing--3xs);
	z-index: 10;
	white-space: normal;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.favoriteBtn {
	flex-shrink: 0;
	cursor: pointer;
	color: var(--color--text--tint-2);
	opacity: 0.8;

	&.favoriteBtnActive {
		color: var(--color--yellow-500);
	}
}

.pagePath {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

// The project is the way back; the page name carries the weight.
.pagePathRoot {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtle);
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	text-decoration: none;
	// The project name gives way first, so the page name stays readable.
	flex-shrink: 1;

	&:hover {
		color: var(--text-color);
	}
}

.pagePathSeparator {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--md);
}

.projectDetails:hover .favoriteBtn {
	opacity: 1;
}

@include breakpoints.breakpoint('xs-only') {
	.projectHeader {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing--xs);
	}

	.projectDetails {
		width: 100%;
	}

	.headerActions {
		margin-left: auto;
	}
}
</style>
