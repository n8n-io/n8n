<script lang="ts" setup>
import { computed } from 'vue';
import type { IMenuItem } from 'n8n-design-system/types';
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectListItem } from '@/types/projects.types';
import { sortByProperty } from '@/utils/sortUtils';

type Props = {
	collapsed: boolean;
	planName?: string;
};

const props = defineProps<Props>();

const locale = useI18n();
const projectsStore = useProjectsStore();

const home = computed<IMenuItem>(() => ({
	id: 'home',
	label: locale.baseText('projects.menu.overview'),
	icon: 'home',
	route: {
		to: { name: VIEWS.HOMEPAGE },
	},
}));

const getProjectMenuItem = (project: ProjectListItem) => ({
	id: project.id,
	label: project.name,
	icon: props.collapsed ? undefined : 'layer-group',
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
	icon: props.collapsed ? undefined : 'user',
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: projectsStore.personalProject?.id },
		},
	},
}));

const displayProjects = computed(() =>
	sortByProperty(
		'name',
		projectsStore.myProjects.filter((p) => p.type === 'team'),
	),
);
</script>

<template>
	<div :class="$style.projects">
		<ElMenu :collapse="props.collapsed" class="home">
			<N8nMenuItem
				:item="home"
				:compact="props.collapsed"
				:active-tab="projectsStore.projectNavActiveId"
				mode="tabs"
				data-test-id="project-home-menu-item"
			/>
		</ElMenu>
		<hr v-if="projectsStore.isTeamProjectFeatureEnabled" class="mt-m mb-m" />
		<N8nText
			v-if="!props.collapsed && projectsStore.isTeamProjectFeatureEnabled"
			:class="$style.projectsLabel"
			tag="h3"
			bold
		>
			<span>{{ locale.baseText('projects.menu.title') }}</span>
		</N8nText>
		<ElMenu
			v-if="projectsStore.isTeamProjectFeatureEnabled"
			:collapse="props.collapsed"
			:class="$style.projectItems"
		>
			<N8nMenuItem
				:item="personalProject"
				:compact="props.collapsed"
				:active-tab="projectsStore.projectNavActiveId"
				mode="tabs"
				data-test-id="project-personal-menu-item"
			/>
			<N8nMenuItem
				v-for="project in displayProjects"
				:key="project.id"
				:class="{
					[$style.collapsed]: props.collapsed,
				}"
				:item="getProjectMenuItem(project)"
				:compact="props.collapsed"
				:active-tab="projectsStore.projectNavActiveId"
				mode="tabs"
				data-test-id="project-menu-item"
			/>
		</ElMenu>
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
	margin: 0 var(--spacing-xs) var(--spacing-s);
	padding: 0 var(--spacing-s);
	text-overflow: ellipsis;
	overflow: hidden;
	box-sizing: border-box;
	color: var(--color-text-base);
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
