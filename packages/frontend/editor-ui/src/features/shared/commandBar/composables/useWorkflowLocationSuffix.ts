import { useI18n } from '@n8n/i18n';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';

/** Minimal shape needed to describe where a workflow lives. */
export type WorkflowLocation = {
	homeProject?: { name?: string | null; type?: string; icon?: unknown } | null;
	parentFolder?: { id: string; name: string } | null;
};

/**
 * Renders the "project / folder" subtitle shown on workflow-ish command bar results.
 *
 * Shared by the workflow-name section and the node content search section so both
 * resolve personal projects to a localized label rather than the owner's raw
 * project name.
 */
export function useWorkflowLocationSuffix() {
	const i18n = useI18n();
	const foldersStore = useFoldersStore();

	const buildFolderPath = (folderId: string): string[] => {
		const path: string[] = [];
		let currentFolderId: string | undefined = folderId;

		// Traverse up the folder hierarchy using the cache
		while (currentFolderId) {
			const folder = foldersStore.getCachedFolder(currentFolderId);
			if (!folder) break;

			path.unshift(folder.name);
			currentFolderId = folder.parentFolder;
		}

		return path;
	};

	const getProjectIcon = (location: WorkflowLocation): IconOrEmoji => {
		if (location.homeProject?.type === ProjectTypes.Personal) {
			return { type: 'icon', value: 'user' };
		}

		if (location.homeProject?.name) {
			return isIconOrEmoji(location.homeProject.icon)
				? location.homeProject.icon
				: { type: 'icon', value: 'layers' };
		}

		return { type: 'icon', value: 'house' };
	};

	const getSuffix = (location: WorkflowLocation): string => {
		const parts: string[] = [];

		if (location.homeProject?.type === ProjectTypes.Personal) {
			parts.push(i18n.baseText('projects.menu.personal'));
		} else if (location.homeProject?.name) {
			parts.push(location.homeProject.name);
		}

		if (location.parentFolder?.id) {
			const folderPath = buildFolderPath(location.parentFolder.id);
			// If there are more than 2 folders, show first, "...", and last
			if (folderPath.length > 2) {
				parts.push(folderPath[0], '...', folderPath[folderPath.length - 1]);
			} else {
				parts.push(...folderPath);
			}
		}

		return parts.join(' / ');
	};

	/** Seed the folder cache so `getSuffix` can render breadcrumbs for these results. */
	const cacheParentFolders = (locations: WorkflowLocation[]) => {
		const parentFolders = locations
			.map((location) => location.parentFolder)
			.filter((folder): folder is { id: string; name: string } => !!folder);

		if (parentFolders.length === 0) return;

		foldersStore.cacheFolders(
			parentFolders.map((folder) => ({
				id: folder.id,
				name: folder.name,
				parentFolder: undefined, // We don't have the parent's parent info yet
			})),
		);
	};

	return { getSuffix, getProjectIcon, cacheParentFolders };
}
