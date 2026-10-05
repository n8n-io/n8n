/**
 * PROTOTYPE (workspaces): the workspaces the user can see, and which of them
 * show in the sidebar.
 */
import type {
	CreateProjectDto,
	CreateWorkspaceDto,
	UpdateWorkspaceAccessDto,
	WorkspaceListItem,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useProjectsStore } from './projects.store';
import type { ProjectListItem } from './projects.types';
import { ProjectTypes } from './projects.types';
import * as workspacesApi from './workspaces.api';

export const useWorkspacesStore = defineStore('workspacesPrototype', () => {
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();
	const usersStore = useUsersStore();

	const workspaces = ref<WorkspaceListItem[]>([]);
	const loaded = ref(false);

	// Access requests are not sent anywhere yet. Remember them in the browser so the
	// "pending" state survives a reload.
	const requestsKey = computed(() => `n8n:workspaces:access-requests:${usersStore.currentUserId}`);
	const requestedIds = ref<string[]>(readRequestedIds());

	function readRequestedIds(): string[] {
		try {
			const parsed: unknown = JSON.parse(localStorage.getItem(requestsKey.value) ?? '[]');
			return Array.isArray(parsed)
				? parsed.filter((id): id is string => typeof id === 'string')
				: [];
		} catch {
			return [];
		}
	}

	const personalWorkspace = computed(() =>
		workspaces.value.find((w) => w.type === ProjectTypes.PersonalWorkspace),
	);
	const teamWorkspaces = computed(() =>
		workspaces.value.filter((w) => w.type === ProjectTypes.Workspace),
	);
	const joinedWorkspaces = computed(() => teamWorkspaces.value.filter((w) => w.joined));
	const instanceProject = computed(() =>
		projectsStore.myProjects.find((p) => p.type === ProjectTypes.Instance),
	);

	/** The projects in a workspace that the user can open. */
	const projectsIn = (workspaceId: string): ProjectListItem[] =>
		projectsStore.myProjects
			.filter(
				(p) =>
					p.parentId === workspaceId &&
					(p.type === ProjectTypes.Team || p.type === ProjectTypes.Personal),
			)
			.sort((a, b) => {
				// The personal project comes first in the personal workspace.
				if (a.type !== b.type) return a.type === ProjectTypes.Personal ? -1 : 1;
				return (a.name ?? '').localeCompare(b.name ?? '');
			});

	const getById = (id: string) => workspaces.value.find((w) => w.id === id);

	/** The list leaves out the personal workspace when the security policy turns it off. */
	const personalSpacesEnabled = computed(
		() => !loaded.value || personalWorkspace.value !== undefined,
	);

	const hasRequestedAccess = (workspaceId: string) => requestedIds.value.includes(workspaceId);

	async function fetchWorkspaces() {
		workspaces.value = await workspacesApi.getWorkspaces(rootStore.restApiContext);
		loaded.value = true;
	}

	// Members of other users join as viewers, which changes the projects they can open.
	async function join(workspaceId: string) {
		await workspacesApi.joinWorkspace(rootStore.restApiContext, workspaceId);
		await Promise.all([fetchWorkspaces(), projectsStore.getMyProjects()]);
	}

	async function leave(workspaceId: string) {
		await workspacesApi.leaveWorkspace(rootStore.restApiContext, workspaceId);
		await Promise.all([fetchWorkspaces(), projectsStore.getMyProjects()]);
	}

	async function updateAccess(workspaceId: string, payload: UpdateWorkspaceAccessDto) {
		await workspacesApi.updateWorkspaceAccess(rootStore.restApiContext, workspaceId, payload);
		await Promise.all([fetchWorkspaces(), projectsStore.getMyProjects()]);
	}

	/** PROTOTYPE: a real build sends the request to the workspace admins for approval. */
	function requestAccess(workspaceId: string) {
		requestedIds.value = [...new Set([...requestedIds.value, workspaceId])];
		try {
			localStorage.setItem(requestsKey.value, JSON.stringify(requestedIds.value));
		} catch {
			// The pending state is only a convenience.
		}
	}

	async function createWorkspace(payload: CreateWorkspaceDto) {
		const workspace = await workspacesApi.createWorkspace(rootStore.restApiContext, payload);
		await Promise.all([fetchWorkspaces(), projectsStore.getMyProjects()]);
		return workspace;
	}

	async function createProject(workspaceId: string, payload: CreateProjectDto) {
		const project = await workspacesApi.createProjectInWorkspace(
			rootStore.restApiContext,
			workspaceId,
			payload,
		);
		await Promise.all([fetchWorkspaces(), projectsStore.getMyProjects()]);
		return project;
	}

	return {
		workspaces,
		loaded,
		personalWorkspace,
		teamWorkspaces,
		joinedWorkspaces,
		instanceProject,
		projectsIn,
		getById,
		personalSpacesEnabled,
		hasRequestedAccess,
		fetchWorkspaces,
		join,
		leave,
		updateAccess,
		requestAccess,
		createWorkspace,
		createProject,
	};
});
