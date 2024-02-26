import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useRootStore } from '@/stores/n8nRoot.store';
import * as projectsApi from '@/features/projects/projects.api';
import type {
	Project,
	ProjectCreateRequest,
	ProjectUpdateRequest,
	ProjectRelationsRequest,
} from '@/features/projects/projects.types';

export const useProjectsStore = defineStore('projects', () => {
	const route = useRoute();
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
		myProjects.value = (await projectsApi.getMyProjects(rootStore.getRestApiContext)).filter(
			(p) => !!p.name,
		);
	};

	const getPersonalProject = async () => {
		personalProject.value = await projectsApi.getPersonalProject(rootStore.getRestApiContext);
	};

	const createProject = async (project: ProjectCreateRequest): Promise<Project> => {
		const newProject = await projectsApi.createProject(rootStore.getRestApiContext, project);
		projects.value.unshift(newProject);
		myProjects.value.unshift(newProject);
		return newProject;
	};

	const setProjectRelations = async (projectRelations: ProjectRelationsRequest) => {
		await projectsApi.setProjectRelations(rootStore.getRestApiContext, projectRelations);
	};

	const updateProject = async (projectData: ProjectUpdateRequest) => {
		await projectsApi.updateProject(rootStore.getRestApiContext, projectData);
		const projectIndex = myProjects.value.findIndex((p) => p.id === projectData.id);
		if (projectIndex !== -1) {
			myProjects.value[projectIndex].name = projectData.name;
		}
	};

	watch(
		route,
		(newRoute) => {
			const project = myProjects.value.find((p) => p.id === newRoute.params?.projectId);
			if (project) {
				setCurrentProject(project);
			}
		},
		{ immediate: true },
	);

	watch(
		myProjects,
		(newProjects) => {
			const project = newProjects.find((p) => p.id === route?.params?.projectId);
			if (project) {
				setCurrentProject(project);
			}
		},
		{ immediate: true },
	);

	return {
		projects,
		myProjects,
		currentProject,
		setCurrentProject,
		getAllProjects,
		getMyProjects,
		getPersonalProject,
		createProject,
		setProjectRelations,
		updateProject,
	};
});
