import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useRootStore } from '@/stores/n8nRoot.store';
import * as projectsApi from '@/features/projects/projects.api';
import type {
	Project,
	ProjectCreateRequest,
	ProjectListItem,
	ProjectUpdateRequest,
} from '@/features/projects/projects.types';

export const useProjectsStore = defineStore('projects', () => {
	const route = useRoute();
	const rootStore = useRootStore();

	const projects = ref<ProjectListItem[]>([]);
	const myProjects = ref<ProjectListItem[]>([]);
	const personalProject = ref<Project | null>(null);
	const currentProject = ref<Project | null>(null);

	const currentProjectId = computed(
		() =>
			(route.params?.projectId as string | undefined) ||
			(route.query?.projectId as string | undefined) ||
			currentProject.value?.id,
	);

	const personalProjects = computed(() => projects.value.filter((p) => p.type === 'personal'));
	const teamProjects = computed(() => projects.value.filter((p) => p.type === 'team'));

	const setCurrentProject = (project: Project | null) => {
		currentProject.value = project;
	};

	const getAllProjects = async () => {
		projects.value = await projectsApi.getAllProjects(rootStore.getRestApiContext);
	};

	const getMyProjects = async () => {
		myProjects.value = (await projectsApi.getMyProjects(rootStore.getRestApiContext)).filter(
			(p) => !!p.name,
		);
	};

	const getPersonalProject = async () => {
		personalProject.value = await projectsApi.getPersonalProject(rootStore.getRestApiContext);
	};

	const getProject = async (id: string) => {
		currentProject.value = await projectsApi.getProject(rootStore.getRestApiContext, id);
	};

	const createProject = async (project: ProjectCreateRequest): Promise<Project> => {
		const newProject = await projectsApi.createProject(rootStore.getRestApiContext, project);
		const { id, name } = newProject;
		myProjects.value.push({ id, name } as ProjectListItem);
		return newProject;
	};

	const updateProject = async (projectData: ProjectUpdateRequest): Promise<void> => {
		await projectsApi.updateProject(rootStore.getRestApiContext, projectData);
		const projectIndex = myProjects.value.findIndex((p) => p.id === projectData.id);
		if (projectIndex !== -1) {
			myProjects.value[projectIndex].name = projectData.name;
		}
	};

	const deleteProject = async (projectId: string, transferId?: string): Promise<void> => {
		await projectsApi.deleteProject(rootStore.getRestApiContext, projectId, transferId);
		myProjects.value = myProjects.value.filter((p) => p.id !== projectId);
	};

	watch(
		route,
		async (newRoute) => {
			if (newRoute?.path?.includes('home')) {
				setCurrentProject(null);
			}

			if (!newRoute?.params?.projectId) {
				return;
			}

			await getProject(newRoute.params.projectId as string);
		},
		{ immediate: true },
	);

	return {
		projects,
		myProjects,
		currentProject,
		currentProjectId,
		personalProjects,
		teamProjects,
		setCurrentProject,
		getAllProjects,
		getMyProjects,
		getPersonalProject,
		getProject,
		createProject,
		updateProject,
		deleteProject,
	};
});
