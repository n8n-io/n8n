import type {
	FolderConflict,
	FolderConflictPolicy,
	ImportContext,
	LayoutConflictPolicy,
} from '../../n8n-packages.types';

export interface PreparedFolder {
	sourceFolderId: string;
	name: string;
	parentFolderId: string | null;
}

export interface FolderImportContext extends ImportContext {
	folderConflictPolicy: FolderConflictPolicy;
	layoutConflictPolicy?: LayoutConflictPolicy;
	/** The folders a `follow-package` move may touch. Omitted means all. */
	movableFolderIds?: ReadonlySet<string>;
}

export type FolderPlannedAction = 'create' | 'skip' | 'update';

export interface FolderPlanItem {
	action: FolderPlannedAction;
	sourceFolderId: string;
	name: string;
	targetParentFolderId: string | null;
	/** On `update`: the folder moves to `targetParentFolderId`. */
	moved?: true;
	/** On `update`: the folder takes `name`. */
	renamed?: true;
}

export interface FolderImportPlan {
	items: FolderPlanItem[];
	conflicts: FolderConflict[];
}
