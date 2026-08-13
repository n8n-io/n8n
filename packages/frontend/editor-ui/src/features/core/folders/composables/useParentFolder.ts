import { useFoldersStore } from '../folders.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ResourceParentFolder } from '../folders.types';

export function useParentFolder() {
	const foldersStore = useFoldersStore();
	const projectsStore = useProjectsStore();

	// Fetches parent folder data from cache or API.
	// This happens when user lands straight on the new workflow page and we have nothing in the store.
	const fetchParentFolder = async (folderId?: string): Promise<ResourceParentFolder | null> => {
		if (!folderId) return null;

		let folder = foldersStore.getCachedFolder(folderId);
		if (!folder && projectsStore.currentProjectId) {
			await foldersStore.getFolderPath(projectsStore.currentProjectId, folderId);
			folder = foldersStore.getCachedFolder(folderId);
		}

		if (!folder) return null;

		return {
			id: folder.id,
			name: folder.name,
			parentFolderId: folder.parentFolder ?? null,
		};
	};

	return { fetchParentFolder };
}
