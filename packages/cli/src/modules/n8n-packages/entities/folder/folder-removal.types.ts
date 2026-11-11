import type { FolderRemovalFailure } from '../../n8n-packages.types';

/** A folder on the target that the package does not define and that nothing is left inside. */
export interface RemovableFolder {
	id: string;
	name: string;
	parentFolderId: string | null;
	/** Depth from the project root, so children are deleted before the parents that held them. */
	depth: number;
}

export interface FolderRemovalPlan {
	removals: RemovableFolder[];
	failures: FolderRemovalFailure[];
}
