import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as dataTableApi from '@/features/dataTable/dataTable.api';
import * as projectsApi from './projects.api';
import * as workflowsApi from '@/api/workflows';
import * as workflowsEEApi from '@/api/workflows.ee';
import * as credentialsApi from '@/api/credentials';
import * as credentialsEEApi from '@/api/credentials.ee';
import type { Project, ProjectListItem, ProjectsCount } from './projects.types';
import { ProjectTypes } from './projects.types';
import { useSettingsStore } from '@/stores/settings.store';
import { hasPermission } from '@/utils/rbac/permissions';
import type { IWorkflowDb } from '@/Interface';
import { useCredentialsStore } from '@/stores/credentials.store';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@/stores/users.store';
import { getResourcePermissions } from '@n8n/permissions';
import type { CreateProjectDto, UpdateProjectDto } from '@n8n/api-types';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';

export type ResourceCounts = {
	credentials: number;
	workflows: number;
	dataTables: number;
};

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

	async function fetchAndSetProject(projectId: string) {
		if (projectId && currentProject.value?.id !== projectId) {
			const project = await fetchProject(projectId);
			setCurrentProject(project);
		}
	}

	async function refreshCurrentProject() {
		if (currentProjectId.value && currentProject.value?.id !== currentProjectId.value) {
			await fetchAndSetProject(currentProjectId.value);
		}
	}

	const createProject = async (project: CreateProjectDto): Promise<Project> => {
		const newProject = await projectsApi.createProject(rootStore.restApiContext, project);
		await getProjectsCount();
		myProjects.value = [...myProjects.value, newProject as unknown as ProjectListItem];
		return newProject;
	};

	const updateProject = async (id: Project['id'], projectData: UpdateProjectDto): Promise<void> => {
		const { name, icon, description } = projectData;
		const payload: UpdateProjectDto = {};
		if (name !== undefined) payload.name = name;
		if (icon !== undefined) payload.icon = icon;
		if (description !== undefined) payload.description = description;
		await projectsApi.updateProject(rootStore.restApiContext, id, payload);
		const projectIndex = myProjects.value.findIndex((p) => p.id === id);
		const { name: nm, icon: ic, description: desc } = { name, icon, description };
		if (projectIndex !== -1) {
			if (nm !== undefined) myProjects.value[projectIndex].name = nm;
			if (ic !== undefined) myProjects.value[projectIndex].icon = ic;
			if (desc !== undefined) myProjects.value[projectIndex].description = desc;
		}
		if (currentProject.value) {
			if (nm !== undefined) currentProject.value.name = nm;
			if (ic !== undefined) currentProject.value.icon = ic;
			if (desc !== undefined) currentProject.value.description = desc;
		}
	};

	const addMember = async (
		projectId: string,
		{ userId, role }: { userId: string; role: string },
	): Promise<void> => {
		await projectsApi.addProjectMembers(rootStore.restApiContext, projectId, [{ userId, role }]);
		await getProject(projectId);
	};

	const updateMemberRole = async (
		projectId: string,
		userId: string,
		role: string,
	): Promise<void> => {
		await projectsApi.updateProjectMemberRole(rootStore.restApiContext, projectId, userId, role);
		await getProject(projectId);
	};

	const removeMember = async (projectId: string, userId: string): Promise<void> => {
		await projectsApi.deleteProjectMember(rootStore.restApiContext, projectId, userId);
		await getProject(projectId);
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
		workflowHomeProject?: IWorkflowDb['homeProject'],
		sharedWithProjects?: IWorkflowDb['sharedWithProjects'],
	) => {
		// For personal shared workflows, we need to show "Shared with you"
		const isSharedWithMe =
			personalProject.value?.id !== workflowHomeProject?.id &&
			workflowHomeProject?.type === ProjectTypes.Personal &&
			sharedWithProjects?.some((project) => project.id === personalProject.value?.id);

		if (isSharedWithMe) {
			projectNavActiveId.value = 'shared';
			setCurrentProject(null);
			return;
		}

		if (workflowHomeProject?.type === ProjectTypes.Personal) {
			// Handle personal projects
			const isOwnPersonalProject = personalProject.value?.id === workflowHomeProject?.id;
			// If it's current user's personal project, set it as current project
			if (isOwnPersonalProject) {
				projectNavActiveId.value = workflowHomeProject?.id ?? null;
				currentProject.value = personalProject.value;
				return;
			} else {
				// Else default to overview page
				projectNavActiveId.value = 'home';
				return;
			}
		}

		// Handle team projects
		projectNavActiveId.value = workflowHomeProject?.id ?? null;
		if (workflowHomeProject?.id && !currentProjectId.value) {
			await getProject(workflowHomeProject?.id);
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

	const getResourceCounts = async (projectId: string): Promise<ResourceCounts> => {
		const [credentials, workflows, dataTables] = await Promise.all([
			credentialsApi.getAllCredentials(rootStore.restApiContext, { projectId }),
			workflowsApi.getWorkflows(rootStore.restApiContext, { projectId }),
			dataTableApi.fetchDataTablesApi(rootStore.restApiContext, projectId),
		]);

		return {
			credentials: credentials.length,
			workflows: workflows.count,
			dataTables: dataTables.count,
		};
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
		getProject,
		fetchProject,
		fetchAndSetProject,
		refreshCurrentProject,
		createProject,
		updateProject,
		addMember,
		updateMemberRole,
		removeMember,
		deleteProject,
		getProjectsCount,
		setProjectNavActiveIdByWorkflowHomeProject,
		moveResourceToProject,
		getResourceCounts,
	};
});
