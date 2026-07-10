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

export type FolderPlannedAction = 'create' | 'skip';

/** The decided action for one folder plus the target parent it resolves to. */
export interface FolderPlanItem {
	action: FolderPlannedAction;
	sourceFolderId: string;
	name: string;
	targetParentFolderId: string | null;
}

/**
 * The planned actions for the package folders plus any conflicts that abort the
 * import before anything is written. Folders are ordered parent-before-child.
 */
export interface FolderImportPlan {
	items: FolderPlanItem[];
	conflicts: FolderConflict[];
}
