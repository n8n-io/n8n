<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IMenuItem } from 'n8n-design-system/types';
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { ProjectListItem } from '@/features/projects/projects.types';
import { hasPermission } from '@/rbac/permissions';
import { useToast } from '@/composables/useToast';

type Props = {
	collapsed: boolean;
};

const props = defineProps<Props>();

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const toast = useToast();
const projectsStore = useProjectsStore();

const isCreatingProject = ref(false);
const home = ref<IMenuItem>({
	id: 'home',
	label: locale.baseText('projects.menu.home'),
	icon: 'home',
	route: {
		to: { name: VIEWS.HOMEPAGE },
	},
});
const addProject = ref<IMenuItem>({
	id: 'addProject',
	label: locale.baseText('projects.menu.addProject'),
	icon: 'plus',
	disabled: isCreatingProject.value,
});

const activeTab = computed(() => {
	let routes = [VIEWS.HOMEPAGE, VIEWS.WORKFLOWS, VIEWS.CREDENTIALS];
	if (projectsStore.currentProjectId === undefined) {
		routes = [
			...routes,
			VIEWS.NEW_WORKFLOW,
			VIEWS.WORKFLOW_HISTORY,
			VIEWS.WORKFLOW,
			VIEWS.EXECUTION_HOME,
		];
	}
	return routes.includes(route.name as VIEWS) ? 'home' : undefined;
});

const isActiveProject = (projectId: string) =>
	route?.params?.projectId === projectId || projectsStore.currentProjectId === projectId
		? projectId
		: undefined;
const getProjectMenuItem = (project: ProjectListItem) => ({
	id: project.id,
	label: project.name,
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: project.id },
		},
	},
});

const homeClicked = () => {};
const projectClicked = () => {};
const addProjectClicked = async () => {
	isCreatingProject.value = true;
	addProject.value.isLoading = true;
	addProject.value.disabled = true;

	try {
		const newProject = await projectsStore.createProject({
			name: locale.baseText('projects.settings.newProjectName'),
		});
		await router.push({ name: VIEWS.PROJECT_SETTINGS, params: { projectId: newProject.id } });
		toast.showMessage({
			title: locale.baseText('projects.settings.save.successful.title', {
				interpolate: { projectName: newProject.name ?? '' },
			}),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('projects.error.title'));
	} finally {
		isCreatingProject.value = false;
		addProject.value.isLoading = false;
		addProject.value.disabled = false;
	}
};

const canCreateProjects = computed(() => {
	return hasPermission(['rbac'], { rbac: { scope: 'project:create' } });
});

const displayProjects = computed(() => {
	return projectsStore.myProjects
		.filter((p) => p.type === 'team')
		.toSorted((a, b) => {
			if (!a.name || !b.name) {
				return 0;
			}
			if (a.name > b.name) {
				return 1;
			} else if (a.name < b.name) {
				return -1;
			}
			return 0;
		});
});
</script>

<template>
	<div :class="$style.projects">
		<ElMenu :collapse="props.collapsed" class="home">
			<N8nMenuItem
				:item="home"
				:compact="props.collapsed"
				:handle-select="homeClicked"
				:active-tab="activeTab"
				mode="tabs"
				data-test-id="project-home-menu-item"
			/>
		</ElMenu>
		<hr v-if="displayProjects.length || canCreateProjects" class="mt-m mb-m" />
		<ElMenu v-if="displayProjects.length" :collapse="props.collapsed" :class="$style.projectItems">
			<N8nMenuItem
				v-for="project in displayProjects"
				:key="project.id"
				:item="getProjectMenuItem(project)"
				:compact="props.collapsed"
				:handle-select="projectClicked"
				:active-tab="isActiveProject(project.id)"
				mode="tabs"
				data-test-id="project-menu-item"
			/>
		</ElMenu>
		<ElMenu v-if="canCreateProjects" :collapse="props.collapsed" class="pl-xs pr-xs">
			<N8nMenuItem
				:item="addProject"
				:compact="props.collapsed"
				:handle-select="addProjectClicked"
				mode="tabs"
				data-test-id="add-project-menu-item"
			/>
		</ElMenu>
		<hr v-if="displayProjects.length || canCreateProjects" class="mt-m mb-m" />
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
</style>

<style lang="scss" scoped>
.home {
	padding: 0 var(--spacing-xs);

	:deep(.el-menu-item) {
		padding: var(--spacing-m) var(--spacing-xs) !important;
	}
}
</style>
