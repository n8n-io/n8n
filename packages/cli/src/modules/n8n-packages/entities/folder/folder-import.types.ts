import type { FolderConflict, FolderConflictPolicy, ImportContext } from '../../n8n-packages.types';

/** A folder shell parsed out of the package, ready to reconcile against the target project. */
export interface PreparedFolder {
	sourceFolderId: string;
	name: string;
	/**
	 * Parent folder id relative to the exported set: null when the folder roots the
	 * exported forest, otherwise another package folder's id (ids are reused on import).
	 */
	parentFolderId: string | null;
}

/** Apply-time context for the folder importer. */
export interface FolderImportContext extends ImportContext {
	folderConflictPolicy: FolderConflictPolicy;
}

export type FolderPlannedAction = 'create' | 'update' | 'skip';

/**
 * The decided plan for one folder. `create` carries the resolved target parent id
 * (the folder is written under it); `update`/`skip` operate on the matched folder.
 */
export type FolderPlanItem =
	| { action: 'create'; sourceFolderId: string; name: string; targetParentFolderId: string | null }
	| { action: 'update'; sourceFolderId: string; name: string }
	| { action: 'skip'; sourceFolderId: string; name: string };

/**
 * The planned actions for the package folders plus any conflicts that abort the
 * import before anything is written. Folders are ordered parent-before-child.
 */
export interface FolderImportPlan {
	items: FolderPlanItem[];
	conflicts: FolderConflict[];
}
