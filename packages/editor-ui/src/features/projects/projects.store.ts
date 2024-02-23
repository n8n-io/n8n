import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useRootStore } from '@/stores/n8nRoot.store';
import * as projectsApi from '@/features/projects/projects.api';
import type {
	Project,
	ProjectCreateRequest,
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
	const isProjectRoute = ref(false);

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

	watch(
		route,
		(newRoute) => {
			isProjectRoute.value = (newRoute?.name ?? '').toString().toLowerCase().startsWith('project');
			const project = myProjects.value.find((p) => p.id === newRoute.params?.projectId);
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
		isProjectRoute,
		setCurrentProject,
		getAllProjects,
		getMyProjects,
		getPersonalProject,
		createProject,
		setProjectRelations,
	};
});
