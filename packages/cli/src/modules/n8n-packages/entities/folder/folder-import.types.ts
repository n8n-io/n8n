import type {
	FolderConflict,
	FolderConflictPolicy,
	ImportContext,
	PlacementPolicy,
} from '../../n8n-packages.types';

export interface PreparedFolder {
	sourceFolderId: string;
	name: string;
	parentFolderId: string | null;
}

export interface FolderImportContext extends ImportContext {
	folderConflictPolicy: FolderConflictPolicy;
	placementPolicy?: PlacementPolicy;
	/** The folders a `follow-package` move may touch. Omitted means all. */
	movableFolderIds?: ReadonlySet<string>;
}

export type FolderPlannedAction = 'create' | 'skip' | 'move';

export interface FolderPlanItem {
	action: FolderPlannedAction;
	sourceFolderId: string;
	name: string;
	targetParentFolderId: string | null;
}

export interface FolderImportPlan {
	items: FolderPlanItem[];
	conflicts: FolderConflict[];
}
