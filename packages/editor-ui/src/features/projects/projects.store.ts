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
	ProjectsCount,
} from '@/features/projects/projects.types';
import { useSettingsStore } from '@/stores/settings.store';
import { hasPermission } from '@/rbac/permissions';
import { ProjectTypes } from './projects.utils';
import type { IWorkflowDb } from '@/Interface';

export const useProjectsStore = defineStore('projects', () => {
	const route = useRoute();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const projects = ref<ProjectListItem[]>([]);
	const myProjects = ref<ProjectListItem[]>([]);
	const personalProject = ref<Project | null>(null);
	const currentProject = ref<Project | null>(null);
	const projectsCount = ref<ProjectsCount>({
		personal: 0,
		team: 0,
		public: 0,
	});
	const projectNavActiveIdState = ref<string | string[] | null>(null);

	const currentProjectId = computed(
		() =>
			(route.params?.projectId as string | undefined) ??
			(route.query?.projectId as string | undefined) ??
			currentProject.value?.id,
	);
	const isProjectHome = computed(() => route.path.includes('home'));
	const personalProjects = computed(() =>
		projects.value.filter((p) => p.type === ProjectTypes.Personal),
	);
	const teamProjects = computed(() => projects.value.filter((p) => p.type === ProjectTypes.Team));
	const teamProjectsLimit = computed(() => settingsStore.settings.enterprise.projects.team.limit);
	const teamProjectsAvailable = computed<boolean>(
		() => settingsStore.settings.enterprise.projects.team.limit !== 0,
	);
	const hasUnlimitedProjects = computed<boolean>(
		() => settingsStore.settings.enterprise.projects.team.limit === -1,
	);
	const teamProjectLimitExceeded = computed<boolean>(
		() => projectsCount.value.team >= teamProjectsLimit.value,
	);
	const canCreateProjects = computed<boolean>(
		() =>
			hasUnlimitedProjects.value ||
			(teamProjectsAvailable.value && !teamProjectLimitExceeded.value),
	);
	const hasPermissionToCreateProjects = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'project:create' } }),
	);

	const projectNavActiveId = computed<string | string[] | null>({
		get: () => route?.params?.projectId ?? projectNavActiveIdState.value,
		set: (value: string | string[] | null) => {
			projectNavActiveIdState.value = value;
		},
	});

	const setCurrentProject = (project: Project | null) => {
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

	const fetchProject = async (id: string) =>
		await projectsApi.getProject(rootStore.getRestApiContext, id);

	const getProject = async (id: string) => {
		currentProject.value = await fetchProject(id);
	};

	const createProject = async (project: ProjectCreateRequest): Promise<Project> => {
		const newProject = await projectsApi.createProject(rootStore.getRestApiContext, project);
		await getProjectsCount();
		myProjects.value = [...myProjects.value, newProject as unknown as ProjectListItem];
		return newProject;
	};

	const updateProject = async (projectData: ProjectUpdateRequest): Promise<void> => {
		await projectsApi.updateProject(rootStore.getRestApiContext, projectData);
		const projectIndex = myProjects.value.findIndex((p) => p.id === projectData.id);
		if (projectIndex !== -1) {
			myProjects.value[projectIndex].name = projectData.name;
		}
		if (currentProject.value) {
			currentProject.value.name = projectData.name;
		}
		if (projectData.relations) {
			await getProject(projectData.id);
		}
	};

	const deleteProject = async (projectId: string, transferId?: string): Promise<void> => {
		await projectsApi.deleteProject(rootStore.getRestApiContext, projectId, transferId);
		await getProjectsCount();
		myProjects.value = myProjects.value.filter((p) => p.id !== projectId);
	};

	const getProjectsCount = async () => {
		projectsCount.value = await projectsApi.getProjectsCount(rootStore.getRestApiContext);
	};

	const setProjectNavActiveIdByWorkflowHomeProject = async (
		homeProject?: IWorkflowDb['homeProject'],
	) => {
		if (homeProject?.type === ProjectTypes.Personal) {
			projectNavActiveId.value = 'home';
		} else {
			projectNavActiveId.value = homeProject?.id ?? null;
			if (homeProject?.id && !currentProjectId.value) {
				await getProject(homeProject?.id);
			}
		}
	};

	watch(
		route,
		async (newRoute) => {
			projectNavActiveId.value = null;

			if (newRoute?.path?.includes('home')) {
				projectNavActiveId.value = 'home';
				setCurrentProject(null);
			}

			if (newRoute?.path?.includes('workflow/')) {
				if (currentProjectId.value) {
					projectNavActiveId.value = currentProjectId.value;
				} else {
					projectNavActiveId.value = 'home';
				}
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
		personalProject,
		currentProject,
		currentProjectId,
		isProjectHome,
		personalProjects,
		teamProjects,
		teamProjectsLimit,
		hasUnlimitedProjects,
		canCreateProjects,
		hasPermissionToCreateProjects,
		teamProjectsAvailable,
		projectNavActiveId,
		setCurrentProject,
		getAllProjects,
		getMyProjects,
		getPersonalProject,
		fetchProject,
		getProject,
		createProject,
		updateProject,
		deleteProject,
		getProjectsCount,
		setProjectNavActiveIdByWorkflowHomeProject,
	};
});
