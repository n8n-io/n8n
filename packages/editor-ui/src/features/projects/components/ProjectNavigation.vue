<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IMenuItem } from 'n8n-design-system/types';
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { Project } from '@/features/projects/projects.types';

type Props = {
	collapsed: boolean;
};

const props = defineProps<Props>();

const route = useRoute();
const router = useRouter();
const locale = useI18n();
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
});

const activeTab = computed(() =>
	route.name === VIEWS.HOMEPAGE ||
	route.name === VIEWS.WORKFLOWS ||
	route.name === VIEWS.CREDENTIALS
		? 'home'
		: undefined,
);

const isActiveProject = (projectId: string) =>
	route?.params?.projectId === projectId ? projectId : undefined;
const getProjectMenuItem = (project: Project) => ({
	id: project.id,
	label: project.name,
	route: {
		to: {
			name: route?.params?.projectId ? route?.name : VIEWS.PROJECTS_WORKFLOWS,
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
	} catch (error) {
		console.error(error);
	} finally {
		isCreatingProject.value = false;
		addProject.value.isLoading = false;
		addProject.value.disabled = false;
	}
};
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
		<hr class="mt-m mb-m" />
		<ElMenu :collapse="props.collapsed" :class="$style.projectItems">
			<N8nMenuItem
				v-for="project in projectsStore.myProjects"
				:key="project.id"
				:item="getProjectMenuItem(project)"
				:compact="props.collapsed"
				:handle-select="projectClicked"
				:active-tab="isActiveProject(project.id)"
				mode="tabs"
				data-test-id="project-menu-item"
			/>
		</ElMenu>
		<ElMenu :collapse="props.collapsed" class="pt-s pl-xs pr-xs">
			<N8nMenuItem
				:item="addProject"
				:compact="props.collapsed"
				:handle-select="addProjectClicked"
				mode="tabs"
				data-test-id="add-project-menu-item"
			/>
		</ElMenu>
		<hr class="mt-m mb-m" />
	</div>
</template>

<style lang="scss" module>
.projects {
	display: grid;
	grid-auto-rows: auto;
	width: 100%;
	overflow: hidden;
}

.projectItems {
	height: 100%;
	padding: 0 var(--spacing-xs);
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
