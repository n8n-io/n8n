import { useFoldersStore } from '../folders.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

export function useParentFolder() {
	const foldersStore = useFoldersStore();
	const projectsStore = useProjectsStore();
	const workflowsStore = useWorkflowsStore();

	// This loads user's home project and parent folder data if they are not already loaded.
	// This happens when user lands straight on the new workflow page and we have nothing in the store.
	const fetchAndSetParentFolder = async (folderId?: string) => {
		if (!folderId) return;

		let parentFolder = foldersStore.getCachedFolder(folderId);
		if (!parentFolder && projectsStore.currentProjectId) {
			await foldersStore.getFolderPath(projectsStore.currentProjectId, folderId);
			parentFolder = foldersStore.getCachedFolder(folderId);
		}

		if (parentFolder) {
			workflowsStore.setParentFolder({
				...parentFolder,
				parentFolderId: parentFolder.parentFolder ?? null,
			});
		}

		return parentFolder ?? null;
	};

	return { fetchAndSetParentFolder };
}
