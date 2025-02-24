import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { STORES } from '@/constants';
import type { FolderCreateResponse } from '@/Interface';
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

	return {
		currentFolderId,
		foldersCache,
		currentFolderInfo,
		cacheFolders,
		getCachedFolder,
		createFolder,
	};
});
