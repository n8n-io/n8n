<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useElementSize, useResizeObserver } from '@vueuse/core';
import type { UserAction } from '@n8n/design-system';
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ProjectTypes } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import ProjectTabs from '@/components/Projects/ProjectTabs.vue';
import ProjectIcon from '@/components/Projects/ProjectIcon.vue';
import { getResourcePermissions } from '@n8n/permissions';
import { VIEWS } from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import ProjectCreateResource from '@/components/Projects/ProjectCreateResource.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useProjectPages } from '@/composables/useProjectPages';
import { truncateTextToFitWidth } from '@/utils/formatters/textFormatter';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { IUser } from 'n8n-workflow';
import { type IconOrEmoji, isIconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const settingsStore = useSettingsStore();
const projectPages = useProjectPages();

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

const projectName = computed(() => {
	if (!projectsStore.currentProject) {
		if (projectPages.isOverviewSubPage) {
			return i18n.baseText('projects.menu.overview');
		} else if (projectPages.isSharedSubPage) {
			return i18n.baseText('projects.header.shared.title');
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

const showSettings = computed(
	() =>
		!!route?.params?.projectId &&
		!!projectPermissions.value.update &&
		projectsStore.currentProject?.type === ProjectTypes.Team,
);

const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

const isPersonalProject = computed(() => {
	return homeProject.value?.type === ProjectTypes.Personal;
});

const showFolders = computed(() => {
	return (
		settingsStore.isFoldersFeatureEnabled &&
		[VIEWS.PROJECTS_WORKFLOWS, VIEWS.PROJECTS_FOLDERS].includes(route.name as VIEWS)
	);
});

const ACTION_TYPES = {
	WORKFLOW: 'workflow',
	CREDENTIAL: 'credential',
	FOLDER: 'folder',
} as const;
type ActionTypes = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

const createWorkflowButton = computed(() => ({
	value: ACTION_TYPES.WORKFLOW,
	label: i18n.baseText('projects.header.create.workflow'),
	icon: sourceControlStore.preferences.branchReadOnly ? ('lock' as IconName) : undefined,
	size: 'mini' as const,
	disabled:
		sourceControlStore.preferences.branchReadOnly ||
		!getResourcePermissions(homeProject.value?.scopes).workflow.create,
}));

const menu = computed(() => {
	const items: Array<UserAction<IUser>> = [
		{
			value: ACTION_TYPES.CREDENTIAL,
			label: i18n.baseText('projects.header.create.credential'),
			disabled:
				sourceControlStore.preferences.branchReadOnly ||
				!getResourcePermissions(homeProject.value?.scopes).credential.create,
		},
	];
	if (showFolders.value) {
		items.push({
			value: ACTION_TYPES.FOLDER,
			label: i18n.baseText('projects.header.create.folder'),
			disabled:
				sourceControlStore.preferences.branchReadOnly ||
				!getResourcePermissions(homeProject.value?.scopes).folder.create,
		});
	}
	return items;
});

const showProjectIcon = computed(() => {
	return (
		!projectPages.isOverviewSubPage && !projectPages.isSharedSubPage && !isPersonalProject.value
	);
});

const actions: Record<ActionTypes, (projectId: string) => void> = {
	[ACTION_TYPES.WORKFLOW]: (projectId: string) => {
		void router.push({
			name: VIEWS.NEW_WORKFLOW,
			query: {
				projectId,
				parentFolderId: route.params.folderId as string,
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
		});
	},
	[ACTION_TYPES.FOLDER]: async () => {
		emit('createFolder');
	},
} as const;

const pageType = computed(() => {
	if (projectPages.isOverviewSubPage) {
		return 'overview';
	} else if (projectPages.isSharedSubPage) {
		return 'shared';
	} else {
		return 'project';
	}
});

const sectionDescription = computed(() => {
	if (projectPages.isOverviewSubPage) {
		return i18n.baseText('projects.header.overview.subtitle');
	} else if (projectPages.isSharedSubPage) {
		return i18n.baseText('projects.header.shared.subtitle');
	} else if (isPersonalProject.value) {
		return i18n.baseText('projects.header.personal.subtitle');
	}

	return null;
});

const projectDescription = computed(() => {
	if (projectPages.isProjectsSubPage) {
		return projectsStore.currentProject?.description;
	}

	return null;
});

const projectHeaderRef = ref<HTMLElement | null>(null);
const { width: projectHeaderWidth } = useElementSize(projectHeaderRef);

const headerActionsRef = ref<HTMLElement | null>(null);
const { width: headerActionsWidth } = useElementSize(headerActionsRef);

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

	const availableTextWidth = projectHeaderWidth.value - headerActionsWidth.value;
	// Fallback to N8nText component default font-size, small
	const fontSizeInPixels = projectSubtitleFontSizeInPxs.value ?? 14;
	return truncateTextToFitWidth(projectDescription.value, availableTextWidth, fontSizeInPixels);
});

const onSelect = (action: string) => {
	const executableAction = actions[action as ActionTypes];
	if (!homeProject.value) {
		return;
	}
	executableAction(homeProject.value.id);
};
</script>

<template>
	<div>
		<div ref="projectHeaderRef" :class="$style.projectHeader">
			<div :class="$style.projectDetails">
				<ProjectIcon v-if="showProjectIcon" :icon="headerIcon" :border-less="true" size="medium" />
				<div :class="$style.headerActions">
					<N8nHeading v-if="projectName" bold tag="h2" size="xlarge" data-test-id="project-name">{{
						projectName
					}}</N8nHeading>
					<N8nText v-if="sectionDescription" color="text-light" data-test-id="project-subtitle">
						{{ sectionDescription }}
					</N8nText>
					<template v-else-if="projectDescription">
						<div :class="$style.projectDescriptionWrapper">
							<N8nText color="text-light" data-test-id="project-subtitle">
								{{ projectDescriptionTruncated || projectDescription }}
							</N8nText>
							<div v-if="projectDescriptionTruncated" :class="$style.tooltip">
								<N8nText color="text-light">{{ projectDescription }}</N8nText>
							</div>
						</div>
					</template>
				</div>
			</div>
			<div
				v-if="route.name !== VIEWS.PROJECT_SETTINGS"
				ref="headerActionsRef"
				:class="[$style.headerActions]"
			>
				<N8nTooltip
					:disabled="!sourceControlStore.preferences.branchReadOnly"
					:content="i18n.baseText('readOnlyEnv.cantAdd.any')"
				>
					<ProjectCreateResource
						data-test-id="add-resource-buttons"
						:actions="menu"
						:disabled="sourceControlStore.preferences.branchReadOnly"
						@action="onSelect"
					>
						<N8nButton
							data-test-id="add-resource-workflow"
							v-bind="createWorkflowButton"
							@click="onSelect(ACTION_TYPES.WORKFLOW)"
						/>
					</ProjectCreateResource>
				</N8nTooltip>
			</div>
		</div>
		<slot></slot>
		<div :class="$style.actions">
			<ProjectTabs
				:page-type="pageType"
				:show-executions="!projectPages.isSharedSubPage"
				:show-settings="showSettings"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.projectHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding-bottom: var(--spacing-m);
	min-height: var(--spacing-3xl);
}

.projectDetails {
	display: flex;
	align-items: center;
}

.actions {
	padding: var(--spacing-2xs) 0 var(--spacing-xs);
}

.projectDescriptionWrapper {
	position: relative;
	display: inline-block;

	&:hover .tooltip {
		display: block;
	}
}

.tooltip {
	display: none;
	position: absolute;
	top: 0;
	left: calc(-1 * var(--spacing-3xs));
	background-color: var(--color-background-light);
	padding: 0 var(--spacing-3xs) var(--spacing-3xs);
	z-index: 10;
	white-space: normal;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@include mixins.breakpoint('xs-only') {
	.projectHeader {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing-xs);
	}

	.headerActions {
		margin-left: auto;
	}
}
</style>
