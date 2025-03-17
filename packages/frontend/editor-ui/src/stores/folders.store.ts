import { defineStore } from 'pinia';
import { STORES } from '@/constants';
import type {
	FolderCreateResponse,
	FolderListItem,
	FolderShortInfo,
	FolderTreeResponseItem,
} from '@/Interface';
import * as workflowsApi from '@/api/workflows';
import { useRootStore } from './root.store';
import { ref } from 'vue';

export const useFoldersStore = defineStore(STORES.FOLDERS, () => {
	const rootStore = useRootStore();

	const totalWorkflowCount = ref<number>(0);

	/**
	 * Cache visited folders so we can build breadcrumbs paths without fetching them from the server
	 */
	const breadcrumbsCache = ref<Record<string, FolderShortInfo>>({});

	const cacheFolders = (folders: FolderShortInfo[]) => {
		folders.forEach((folder) => {
			if (!breadcrumbsCache.value[folder.id]) {
				breadcrumbsCache.value[folder.id] = {
					id: folder.id,
					name: folder.name,
					parentFolder: folder.parentFolder,
				};
			}
		});
	};

	const getCachedFolder = (folderId: string) => {
		return breadcrumbsCache.value[folderId];
	};

	async function createFolder(
		name: string,
		projectId: string,
		parentFolderId?: string,
	): Promise<FolderCreateResponse> {
		return await workflowsApi.createFolder(
			rootStore.restApiContext,
			projectId,
			name,
			parentFolderId,
		);
	}

	async function getFolderPath(
		projectId: string,
		folderId: string,
	): Promise<FolderTreeResponseItem[]> {
		const tree = await workflowsApi.getFolderPath(rootStore.restApiContext, projectId, folderId);
		const forCache = extractFoldersForCache(tree);
		cacheFolders(forCache);

		return tree;
	}

	function extractFoldersForCache(
		items: FolderTreeResponseItem[],
		parentFolderId?: string,
	): FolderShortInfo[] {
		let result: FolderShortInfo[] = [];

		items.forEach((item) => {
			// Add current item to result
			result.push({
				id: item.id,
				name: item.name,
				parentFolder: parentFolderId,
			});

			// Process children recursively
			if (item.children && item.children.length > 0) {
				const childFolders = extractFoldersForCache(item.children, item.id);
				result = [...result, ...childFolders];
			}
		});

		return result;
	}

	async function fetchTotalWorkflowsAndFoldersCount(projectId?: string): Promise<number> {
		const { count } = await workflowsApi.getWorkflowsAndFolders(
			rootStore.restApiContext,
			{ projectId },
			{ skip: 0, take: 1 },
			true,
		);
		totalWorkflowCount.value = count;
		return count;
	}

	const deleteFoldersFromCache = (folderIds: string[]) => {
		folderIds.forEach((folderId) => {
			delete breadcrumbsCache.value[folderId];
		});
	};

	async function deleteFolder(projectId: string, folderId: string, newParentId?: string) {
		await workflowsApi.deleteFolder(rootStore.restApiContext, projectId, folderId, newParentId);
	}

	async function renameFolder(projectId: string, folderId: string, name: string) {
		await workflowsApi.renameFolder(rootStore.restApiContext, projectId, folderId, name);
	}

	async function fetchProjectFolders(projectId: string) {
		return await workflowsApi.getProjectFolders(rootStore.restApiContext, projectId);
	}

	async function fetchFoldersAvailableForMove(
		projectId: string,
		folderId?: string,
		filter?: {
			name?: string;
		},
	): Promise<FolderListItem[]> {
		const folders = await workflowsApi.getProjectFolders(
			rootStore.restApiContext,
			projectId,
			{
				sortBy: 'updatedAt:desc',
			},
			{
				excludeFolderIdAndDescendants: folderId,
				name: filter?.name ? filter.name : undefined,
			},
		);
		const forCache: FolderShortInfo[] = folders.map((folder) => ({
			id: folder.id,
			name: folder.name,
			parentFolder: folder.parentFolder?.id,
		}));
		cacheFolders(forCache);
		return folders;
	}

	async function moveFolder(
		projectId: string,
		folderId: string,
		parentFolderId?: string,
	): Promise<void> {
		await workflowsApi.moveFolder(rootStore.restApiContext, projectId, folderId, parentFolderId);
	}

	async function fetchFolderContent(
		projectId: string,
		folderId: string,
	): Promise<{ totalWorkflows: number; totalSubFolders: number }> {
		return await workflowsApi.getFolderContent(rootStore.restApiContext, projectId, folderId);
	}

	return {
		fetchTotalWorkflowsAndFoldersCount,
		breadcrumbsCache,
		cacheFolders,
		getCachedFolder,
		createFolder,
		getFolderPath,
		totalWorkflowCount,
		deleteFolder,
		deleteFoldersFromCache,
		renameFolder,
		fetchProjectFolders,
		fetchFoldersAvailableForMove,
		moveFolder,
		fetchFolderContent,
	};
});
