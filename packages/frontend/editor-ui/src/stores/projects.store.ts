import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as projectsApi from '@/api/projects.api';
import * as workflowsApi from '@/api/workflows';
import * as workflowsEEApi from '@/api/workflows.ee';
import * as credentialsApi from '@/api/credentials';
import * as credentialsEEApi from '@/api/credentials.ee';
import type { Project, ProjectListItem, ProjectsCount } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import { useSettingsStore } from '@/stores/settings.store';
import { hasPermission } from '@/utils/rbac/permissions';
import type { IWorkflowDb } from '@/Interface';
import { useCredentialsStore } from '@/stores/credentials.store';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@/stores/users.store';
import { getResourcePermissions } from '@n8n/permissions';
import type { CreateProjectDto, UpdateProjectDto } from '@n8n/api-types';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';

export const useProjectsStore = defineStore(STORES.PROJECTS, () => {
	const route = useRoute();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const credentialsStore = useCredentialsStore();
	const usersStore = useUsersStore();
	const sourceControlStore = useSourceControlStore();

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

	const globalProjectPermissions = computed(
		() => getResourcePermissions(usersStore.currentUser?.globalScopes).project,
	);
	const availableProjects = computed(() =>
		globalProjectPermissions.value.list ? projects.value : myProjects.value,
	);

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
	const isTeamProjectFeatureEnabled = computed<boolean>(() => teamProjectsLimit.value !== 0);
	const hasUnlimitedProjects = computed<boolean>(() => teamProjectsLimit.value === -1);
	const isTeamProjectLimitExceeded = computed<boolean>(
		() => projectsCount.value.team >= teamProjectsLimit.value,
	);
	const canCreateProjects = computed<boolean>(
		() =>
			(hasUnlimitedProjects.value ||
				(isTeamProjectFeatureEnabled.value && !isTeamProjectLimitExceeded.value)) &&
			!sourceControlStore.preferences.branchReadOnly,
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
		projects.value = await projectsApi.getAllProjects(rootStore.restApiContext);
	};

	const getMyProjects = async () => {
		myProjects.value = await projectsApi.getMyProjects(rootStore.restApiContext);
	};

	const getPersonalProject = async () => {
		personalProject.value = await projectsApi.getPersonalProject(rootStore.restApiContext);
	};

	const getAvailableProjects = async () => {
		if (globalProjectPermissions.value.list) {
			await getAllProjects();
		} else {
			await getMyProjects();
		}
	};

	const fetchProject = async (id: string) =>
		await projectsApi.getProject(rootStore.restApiContext, id);

	const getProject = async (id: string) => {
		currentProject.value = await fetchProject(id);
	};

	const createProject = async (project: CreateProjectDto): Promise<Project> => {
		const newProject = await projectsApi.createProject(rootStore.restApiContext, project);
		await getProjectsCount();
		myProjects.value = [...myProjects.value, newProject as unknown as ProjectListItem];
		return newProject;
	};

	const updateProject = async (
		id: Project['id'],
		projectData: Required<UpdateProjectDto>,
	): Promise<void> => {
		await projectsApi.updateProject(rootStore.restApiContext, id, projectData);
		const projectIndex = myProjects.value.findIndex((p) => p.id === id);
		const { name, icon, description } = projectData;
		if (projectIndex !== -1) {
			myProjects.value[projectIndex].name = name;
			myProjects.value[projectIndex].icon = icon as IconOrEmoji;
			myProjects.value[projectIndex].description = description;
		}
		if (currentProject.value) {
			currentProject.value.name = name;
			currentProject.value.icon = icon as IconOrEmoji;
			currentProject.value.description = description;
		}
		if (projectData.relations) {
			await getProject(id);
		}
	};

	const deleteProject = async (projectId: string, transferId?: string): Promise<void> => {
		await projectsApi.deleteProject(rootStore.restApiContext, projectId, transferId);
		await getProjectsCount();
		myProjects.value = myProjects.value.filter((p) => p.id !== projectId);
	};

	const getProjectsCount = async () => {
		projectsCount.value = await projectsApi.getProjectsCount(rootStore.restApiContext);
	};

	const setProjectNavActiveIdByWorkflowHomeProject = async (
		homeProject?: IWorkflowDb['homeProject'],
	) => {
		// Handle personal projects
		if (homeProject?.type === ProjectTypes.Personal) {
			const isOwnPersonalProject = personalProject.value?.id === homeProject?.id;
			// If it's current user's personal project, set it as current project
			if (isOwnPersonalProject) {
				projectNavActiveId.value = homeProject?.id ?? null;
				currentProject.value = personalProject.value;
			} else {
				// Else default to overview page
				projectNavActiveId.value = 'home';
			}
		} else {
			// Handle team projects
			projectNavActiveId.value = homeProject?.id ?? null;
			if (homeProject?.id && !currentProjectId.value) {
				await getProject(homeProject?.id);
			}
		}
	};

	const moveResourceToProject = async (
		resourceType: 'workflow' | 'credential',
		resourceId: string,
		projectId: string,
		parentFolderId?: string,
		shareCredentials?: string[],
	) => {
		if (resourceType === 'workflow') {
			await workflowsEEApi.moveWorkflowToProject(rootStore.restApiContext, resourceId, {
				destinationProjectId: projectId,
				destinationParentFolderId: parentFolderId,
				shareCredentials,
			});
		} else {
			await credentialsEEApi.moveCredentialToProject(
				rootStore.restApiContext,
				resourceId,
				projectId,
			);
			await credentialsStore.fetchAllCredentials(currentProjectId.value);
		}
	};

	const isProjectEmpty = async (projectId: string) => {
		const [credentials, workflows] = await Promise.all([
			credentialsApi.getAllCredentials(rootStore.restApiContext, { projectId }),
			workflowsApi.getWorkflows(rootStore.restApiContext, { projectId }),
		]);

		return credentials.length === 0 && workflows.count === 0;
	};

	watch(
		route,
		async (newRoute) => {
			projectNavActiveId.value = null;

			if (newRoute?.path?.includes('home')) {
				projectNavActiveId.value = 'home';
				setCurrentProject(null);
			}

			if (newRoute?.path?.includes('shared')) {
				projectNavActiveId.value = 'shared';
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
		availableProjects,
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
		isTeamProjectFeatureEnabled,
		projectNavActiveId,
		setCurrentProject,
		getAllProjects,
		getMyProjects,
		getPersonalProject,
		getAvailableProjects,
		fetchProject,
		getProject,
		createProject,
		updateProject,
		deleteProject,
		getProjectsCount,
		setProjectNavActiveIdByWorkflowHomeProject,
		moveResourceToProject,
		isProjectEmpty,
	};
});
