<script lang="ts" setup>
import { computed, onBeforeMount } from 'vue';
import type { IMenuItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/constants';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectListItem } from '@/types/projects.types';
import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { ElMenu } from 'element-plus';

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
	() => usersStore.allUsers.filter((user) => user.isPendingUser === false).length > 1,
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
		<ElMenu :collapse="props.collapsed" class="home">
			<N8nMenuItem
				:item="home"
				:compact="props.collapsed"
				:active-tab="activeTabId"
				mode="tabs"
				data-test-id="project-home-menu-item"
			/>
			<N8nMenuItem
				v-if="projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled"
				:item="personalProject"
				:compact="props.collapsed"
				:active-tab="activeTabId"
				mode="tabs"
				data-test-id="project-personal-menu-item"
			/>
			<N8nMenuItem
				v-if="
					(projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled) &&
					hasMultipleVerifiedUsers
				"
				:item="shared"
				:compact="props.collapsed"
				:active-tab="activeTabId"
				mode="tabs"
				data-test-id="project-shared-menu-item"
			/>
		</ElMenu>
		<hr v-if="projectsStore.isTeamProjectFeatureEnabled" class="mt-m mb-m" />
		<N8nText
			v-if="!props.collapsed && projectsStore.isTeamProjectFeatureEnabled"
			:class="[$style.projectsLabel]"
			tag="h3"
			bold
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
					@click="globalEntityCreation.createProject"
				/>
			</N8nTooltip>
		</N8nText>
		<ElMenu
			v-if="projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled"
			:collapse="props.collapsed"
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
				:active-tab="activeTabId"
				mode="tabs"
				data-test-id="project-menu-item"
			/>
		</ElMenu>
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
				@click="globalEntityCreation.createProject"
			>
				<span>{{ locale.baseText('projects.menu.addFirstProject') }}</span>
			</N8nButton>
		</N8nTooltip>
		<hr v-if="projectsStore.isTeamProjectFeatureEnabled" class="mb-m" />
	</div>
</template>

<style lang="scss" module>
.projects {
	display: grid;
	grid-auto-rows: auto;
	width: 100%;
	overflow: hidden;
	align-items: start;
	gap: var(--spacing-3xs);
	&:hover {
		.plusBtn {
			display: block;
		}
	}
}

.projectItems {
	height: 100%;
	padding: 0 var(--spacing-xs) var(--spacing-s);
	overflow: auto;
}

.upgradeLink {
	color: var(--color-primary);
	cursor: pointer;
}

.collapsed {
	text-transform: uppercase;
}

.projectsLabel {
	display: flex;
	justify-content: space-between;
	margin: 0 0 var(--spacing-s) var(--spacing-xs);
	padding: 0 var(--spacing-s);
	text-overflow: ellipsis;
	overflow: hidden;
	box-sizing: border-box;
	color: var(--color-text-base);

	&.collapsed {
		padding: 0;
		margin-left: 0;
		justify-content: center;
	}
}

.plusBtn {
	margin: 0;
	padding: 0;
	color: var(--color-text-light);
	display: none;
}

.addFirstProjectBtn {
	font-size: var(--font-size-xs);
	padding: var(--spacing-3xs);
	margin: 0 var(--spacing-m) var(--spacing-m);

	&.collapsed {
		> span:last-child {
			display: none;
			margin: 0 var(--spacing-s) var(--spacing-m);
		}
	}
}
</style>

<style lang="scss" scoped>
.home {
	padding: 0 var(--spacing-xs);

	:deep(.el-menu-item) {
		padding: var(--spacing-m) var(--spacing-xs) !important;
	}
}
</style>
