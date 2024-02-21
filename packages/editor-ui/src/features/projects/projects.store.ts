import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@/stores/n8nRoot.store';
import * as projectsApi from '@/features/projects/projects.api';
import type {
	Project,
	ProjectCreateRequest,
	ProjectRelationsRequest,
} from '@/features/projects/projects.types';

export const useProjectsStore = defineStore('projects', () => {
	const rootStore = useRootStore();
	const projects = ref<Project[]>([]);
	const myProjects = ref<Project[]>([]);
	const personalProject = ref<Project | null>(null);
	const currentProject = ref<Project>({
		id: '',
		name: '',
	});

	const setCurrentProject = (project: Project) => {
		currentProject.value = project;
	};

	const getAllProjects = async () => {
		projects.value = await projectsApi.getAllProjects(rootStore.getRestApiContext);
	};

	const getMyProjects = async () => {
		myProjects.value = await projectsApi.getMyProjects(rootStore.getRestApiContext);
	};

	const getPersonalProject = async () => {
		personalProject.value = await projectsApi.getPersonalProject(rootStore.getRestApiContext);
	};

	const createProject = async (project: ProjectCreateRequest) => {
		const newProject = await projectsApi.createProject(rootStore.getRestApiContext, project);
		projects.value.unshift(newProject);
		myProjects.value.unshift(newProject);
	};

	const setProjectRelations = async (projectRelations: ProjectRelationsRequest) => {
		await projectsApi.setProjectRelations(rootStore.getRestApiContext, projectRelations);
	};

	return {
		projects,
		currentProject,
		setCurrentProject,
		getAllProjects,
		getMyProjects,
		getPersonalProject,
		createProject,
		setProjectRelations,
	};
});
