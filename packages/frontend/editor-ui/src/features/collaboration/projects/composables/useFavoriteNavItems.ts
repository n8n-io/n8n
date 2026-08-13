import { computed } from 'vue';
import type { IMenuItem } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useProjectsStore } from '../projects.store';
import { DEFAULT_PROJECT_ICON } from '../projects.constants';
import type { Project } from '../projects.types';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';
import { PROJECT_FILES_PREVIEW } from '@/features/core/files/constants';
import type { FavoriteResourceType } from '@/app/api/favorites';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';

export type FavoriteGroupItem = {
	menuItem: IMenuItem;
	resourceId: string;
	resourceType: FavoriteResourceType;
};

export type FavoriteGroup = {
	type: FavoriteResourceType;
	items: FavoriteGroupItem[];
};

export function useFavoriteNavItems() {
	const favoritesStore = useFavoritesStore();
	const projectsStore = useProjectsStore();

	const favoriteWorkflowItems = computed<FavoriteGroupItem[]>(() =>
		favoritesStore.favorites
			.filter((f) => f.resourceType === 'workflow')
			.map((f) => ({
				menuItem: {
					id: `favorite-workflow-${f.resourceId}`,
					label: f.resourceName,
					icon: 'log-in' as IMenuItem['icon'],
					route: { to: { name: VIEWS.WORKFLOW, params: { workflowId: f.resourceId } } },
				},
				resourceId: f.resourceId,
				resourceType: 'workflow',
			})),
	);

	const favoriteProjectItems = computed<FavoriteGroupItem[]>(() =>
		favoritesStore.favorites
			.filter((f) => f.resourceType === 'project')
			.map((f) => {
				const project = projectsStore.myProjects.find((p) => p.id === f.resourceId);
				return {
					menuItem: {
						id: f.resourceId,
						label: f.resourceName,
						icon: (project?.icon ?? DEFAULT_PROJECT_ICON) as IMenuItem['icon'],
						route: { to: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: f.resourceId } } },
					},
					resourceId: f.resourceId,
					resourceType: 'project',
				};
			}),
	);

	const favoriteDataTableItems = computed<FavoriteGroupItem[]>(() =>
		favoritesStore.favorites
			.filter((f) => f.resourceType === 'dataTable' && f.resourceProjectId)
			.map((f) => ({
				menuItem: {
					id: `favorite-datatable-${f.resourceId}`,
					label: f.resourceName,
					icon: 'table' as IMenuItem['icon'],
					route: {
						to: {
							name: DATA_TABLE_DETAILS,
							params: { projectId: f.resourceProjectId, id: f.resourceId },
						},
					},
				},
				resourceId: f.resourceId,
				resourceType: 'dataTable',
			})),
	);

	const favoriteFileItems = computed<FavoriteGroupItem[]>(() =>
		favoritesStore.favorites
			.filter((f) => f.resourceType === 'file' && f.resourceProjectId)
			.map((f) => ({
				menuItem: {
					id: `favorite-file-${f.resourceId}`,
					label: f.resourceName,
					icon: 'file' as IMenuItem['icon'],
					route: {
						to: {
							name: PROJECT_FILES_PREVIEW,
							params: { projectId: f.resourceProjectId, id: f.resourceId },
						},
					},
				},
				resourceId: f.resourceId,
				resourceType: 'file',
			})),
	);

	const favoriteFolderItems = computed<FavoriteGroupItem[]>(() =>
		favoritesStore.favorites
			.filter((f) => f.resourceType === 'folder' && f.resourceProjectId)
			.map((f) => ({
				menuItem: {
					id: `favorite-folder-${f.resourceId}`,
					label: f.resourceName,
					icon: 'folder' as IMenuItem['icon'],
					route: {
						to: {
							name: VIEWS.PROJECTS_FOLDERS,
							params: { projectId: f.resourceProjectId, folderId: f.resourceId },
						},
					},
				},
				resourceId: f.resourceId,
				resourceType: 'folder',
			})),
	);

	const favoriteAgentItems = computed<FavoriteGroupItem[]>(() =>
		favoritesStore.favorites
			.filter((f) => f.resourceType === 'agent' && f.resourceProjectId)
			.map((f) => ({
				menuItem: {
					id: `favorite-agent-${f.resourceId}`,
					label: f.resourceName,
					icon: 'robot' as IMenuItem['icon'],
					route: {
						to: {
							name: AGENT_BUILDER_VIEW,
							params: { projectId: f.resourceProjectId, agentId: f.resourceId },
						},
					},
				},
				resourceId: f.resourceId,
				resourceType: 'agent',
			})),
	);

	const favoriteGroups = computed<FavoriteGroup[]>(() => {
		const groups: FavoriteGroup[] = [];
		if (favoriteProjectItems.value.length > 0) {
			groups.push({
				type: 'project',
				items: favoriteProjectItems.value,
			});
		}
		if (favoriteFolderItems.value.length > 0) {
			groups.push({
				type: 'folder',
				items: favoriteFolderItems.value,
			});
		}
		if (favoriteWorkflowItems.value.length > 0) {
			groups.push({
				type: 'workflow',
				items: favoriteWorkflowItems.value,
			});
		}
		if (favoriteDataTableItems.value.length > 0) {
			groups.push({
				type: 'dataTable',
				items: favoriteDataTableItems.value,
			});
		}
		if (favoriteFileItems.value.length > 0) {
			groups.push({
				type: 'file',
				items: favoriteFileItems.value,
			});
		}
		if (favoriteAgentItems.value.length > 0) {
			groups.push({
				type: 'agent',
				items: favoriteAgentItems.value,
			});
		}
		return groups;
	});

	const activeTabId = computed(() => {
		const id = projectsStore.projectNavActiveId;
		return (Array.isArray(id) ? id[0] : id) ?? undefined;
	});

	function onFavoriteProjectClick(itemId: string) {
		const project = projectsStore.myProjects.find((p) => p.id === itemId);
		if (project) {
			projectsStore.setCurrentProject(project as unknown as Project);
		}
	}

	function onFavoriteWorkflowClick() {
		projectsStore.setCurrentProject(null);
	}

	async function onUnpinFavorite(resourceId: string, resourceType: FavoriteResourceType) {
		await favoritesStore.toggleFavorite(resourceId, resourceType);
	}

	return {
		favoriteWorkflowItems,
		favoriteProjectItems,
		favoriteDataTableItems,
		favoriteFileItems,
		favoriteFolderItems,
		favoriteAgentItems,
		favoriteGroups,
		activeTabId,
		onFavoriteProjectClick,
		onFavoriteWorkflowClick,
		onUnpinFavorite,
	};
}
