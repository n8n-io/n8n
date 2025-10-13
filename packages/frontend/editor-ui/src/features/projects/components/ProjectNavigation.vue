<script lang="ts" setup>
import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';
import { VIEWS } from '@/constants';
import { useProjectsStore } from '../projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import type { ProjectListItem } from '../projects.types';
import type { IMenuItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeMount } from 'vue';

import { N8nButton, N8nMenuItem, N8nTooltip, N8nHeading } from '@n8n/design-system';

type Props = {
	collapsed: boolean;
	planName?: string;
};

const props = defineProps<Props>();

const locale = useI18n();
const globalEntityCreation = useGlobalEntityCreation();

const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

const isCreatingProject = computed(() => globalEntityCreation.isCreatingProject.value);
const displayProjects = computed(() => globalEntityCreation.displayProjects.value);
const isFoldersFeatureEnabled = computed(() => settingsStore.isFoldersFeatureEnabled);
const hasMultipleVerifiedUsers = computed(
	() => usersStore.allUsers.filter((user) => !user.isPendingUser).length > 1,
);

const home = computed<IMenuItem>(() => ({
	id: 'home',
	label: locale.baseText('projects.menu.overview'),
	icon: 'house',
	route: {
		to: { name: VIEWS.HOMEPAGE },
	},
}));

const shared = computed<IMenuItem>(() => ({
	id: 'shared',
	label: locale.baseText('projects.menu.shared'),
	icon: 'share',
	route: {
		to: { name: VIEWS.SHARED_WITH_ME },
	},
}));

const getProjectMenuItem = (project: ProjectListItem): IMenuItem => ({
	id: project.id,
	label: project.name ?? '',
	icon: project.icon as IMenuItem['icon'],
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: project.id },
		},
	},
});

const personalProject = computed<IMenuItem>(() => ({
	id: projectsStore.personalProject?.id ?? '',
	label: locale.baseText('projects.menu.personal'),
	icon: 'user',
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: projectsStore.personalProject?.id },
		},
	},
}));

const showAddFirstProject = computed(
	() => projectsStore.isTeamProjectFeatureEnabled && !displayProjects.value.length,
);

const activeTabId = computed(() => {
	return (
		(Array.isArray(projectsStore.projectNavActiveId)
			? projectsStore.projectNavActiveId[0]
			: projectsStore.projectNavActiveId) ?? undefined
	);
});

onBeforeMount(async () => {
	await usersStore.fetchUsers();
});
</script>

<template>
	<div :class="$style.projects">
		<div class="home">
			<N8nMenuItem
				:item="home"
				:compact="props.collapsed"
				:active="activeTabId === 'home'"
				data-test-id="project-home-menu-item"
			/>
			<N8nMenuItem
				v-if="projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled"
				:item="personalProject"
				:compact="props.collapsed"
				:active="activeTabId === personalProject.id"
				data-test-id="project-personal-menu-item"
			/>
			<N8nMenuItem
				v-if="
					(projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled) &&
					hasMultipleVerifiedUsers
				"
				:item="shared"
				:compact="props.collapsed"
				:active="activeTabId === 'shared'"
				data-test-id="project-shared-menu-item"
			/>
		</div>
		<N8nHeading
			v-if="!props.collapsed && projectsStore.isTeamProjectFeatureEnabled"
			:class="[$style.projectsLabel]"
			bold
			size="small"
			color="text-light"
			tag="h3"
		>
			<span>{{ locale.baseText('projects.menu.title') }}</span>
			<N8nTooltip
				v-if="projectsStore.canCreateProjects"
				placement="right"
				:disabled="projectsStore.hasPermissionToCreateProjects"
				:content="locale.baseText('projects.create.permissionDenied')"
			>
				<N8nButton
					icon="plus"
					text
					data-test-id="project-plus-button"
					:disabled="isCreatingProject || !projectsStore.hasPermissionToCreateProjects"
					:class="$style.plusBtn"
					@click="globalEntityCreation.createProject('add_icon')"
				/>
			</N8nTooltip>
		</N8nHeading>
		<div
			v-if="projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled"
			:class="$style.projectItems"
		>
			<N8nMenuItem
				v-for="project in displayProjects"
				:key="project.id"
				:class="{
					[$style.collapsed]: props.collapsed,
				}"
				:item="getProjectMenuItem(project)"
				:compact="props.collapsed"
				:active="activeTabId === project.id"
				data-test-id="project-menu-item"
			/>
		</div>
		<N8nTooltip
			v-if="showAddFirstProject"
			placement="right"
			:disabled="projectsStore.hasPermissionToCreateProjects"
			:content="locale.baseText('projects.create.permissionDenied')"
		>
			<N8nButton
				:class="[
					$style.addFirstProjectBtn,
					{
						[$style.collapsed]: props.collapsed,
					},
				]"
				:disabled="isCreatingProject || !projectsStore.hasPermissionToCreateProjects"
				type="secondary"
				icon="plus"
				data-test-id="add-first-project-button"
				@click="globalEntityCreation.createProject('add_first_project_button')"
			>
				<span>{{ locale.baseText('projects.menu.addFirstProject') }}</span>
			</N8nButton>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.projects {
	width: 100%;
	align-items: start;
	gap: var(--spacing--3xs);
	&:hover {
		.plusBtn {
			display: block;
		}
	}
}

.projectItems {
	padding: var(--spacing--xs);
}

.upgradeLink {
	color: var(--color--primary);
	cursor: pointer;
}

.projectsLabel {
	display: flex;
	justify-content: space-between;
	text-overflow: ellipsis;
	overflow: hidden;
	box-sizing: border-box;
	padding: 0 var(--spacing--sm);
	margin-top: var(--spacing--md);

	&.collapsed {
		padding: 0;
		margin-left: 0;
		justify-content: center;
	}
}

.plusBtn {
	margin: 0;
	padding: 0;
	color: var(--color--text--tint-1);
	display: none;
}

.addFirstProjectBtn {
	font-size: var(--font-size--xs);
	margin: 0 var(--spacing--sm);
	width: calc(100% - var(--spacing--sm) * 2);

	&.collapsed {
		> span:last-child {
			display: none;
			margin: 0 var(--spacing--sm) var(--spacing--md);
		}
	}
}
</style>

<style lang="scss" scoped>
.home {
	padding: 0 var(--spacing--xs);
}
</style>
