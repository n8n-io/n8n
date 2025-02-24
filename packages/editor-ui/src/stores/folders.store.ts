import { STORES } from '@/constants';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useFoldersStore = defineStore(STORES.FOLDERS, () => {
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

	return {
		currentFolderId,
		foldersCache,
		currentFolderInfo,
		cacheFolders,
		getCachedFolder,
	};
});
