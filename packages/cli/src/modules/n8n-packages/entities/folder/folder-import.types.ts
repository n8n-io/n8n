import type { FolderConflict, FolderConflictPolicy, ImportContext } from '../../n8n-packages.types';

export interface PreparedFolder {
	sourceFolderId: string;
	name: string;
	parentFolderId: string | null;
}

export interface FolderImportContext extends ImportContext {
	folderConflictPolicy: FolderConflictPolicy;
}

export type FolderPlannedAction = 'create' | 'skip';

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
