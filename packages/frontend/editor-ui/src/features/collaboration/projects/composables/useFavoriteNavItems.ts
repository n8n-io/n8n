import { computed } from 'vue';
import type { IMenuItem } from '@n8n/design-system/types';
import { VIEWS } from '@/app/constants';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useProjectsStore } from '../projects.store';
import type { Project } from '../projects.types';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';
import type { FavoriteResourceType } from '@/app/api/favorites';

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
					route: { to: { name: VIEWS.WORKFLOW, params: { name: f.resourceId } } },
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
						icon: (project?.icon as IMenuItem['icon']) ?? ('layers' as IMenuItem['icon']),
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
		favoriteFolderItems,
		favoriteGroups,
		activeTabId,
		onFavoriteProjectClick,
		onFavoriteWorkflowClick,
		onUnpinFavorite,
	};
}
