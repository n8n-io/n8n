import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { STORES } from '@/constants';
import type { FolderCreateResponse, FolderTreeResponseItem } from '@/Interface';
import * as workflowsApi from '@/api/workflows';
import { useRootStore } from './root.store';

export const useFoldersStore = defineStore(STORES.FOLDERS, () => {
	const rootStore = useRootStore();

	const currentFolderId = ref<string | null>(null);

	const foldersCache = ref<Record<string, { id: string; name: string; parentFolder?: string }>>({});

	const currentFolderInfo = computed(() => {
		return currentFolderId.value ? foldersCache.value[currentFolderId.value] : null;
	});

	const cacheFolders = (folders: Array<{ id: string; name: string; parentFolder?: string }>) => {
		folders.forEach((folder) => {
			if (!foldersCache.value[folder.id]) {
				foldersCache.value[folder.id] = {
					id: folder.id,
					name: folder.name,
					parentFolder: folder.parentFolder,
				};
			}
		});
	};

	const getCachedFolder = (folderId: string) => {
		return foldersCache.value[folderId];
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
		currentFolderId.value = folderId;

		return tree;
	}

	function extractFoldersForCache(
		items: FolderTreeResponseItem[],
		parentFolderId?: string,
	): Array<{ id: string; name: string; parentFolder?: string }> {
		let result: Array<{ id: string; name: string; parentFolder?: string }> = [];

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

	return {
		currentFolderId,
		foldersCache,
		currentFolderInfo,
		cacheFolders,
		getCachedFolder,
		createFolder,
		getFolderPath,
	};
});
