import type { FolderResource, WorkflowResource } from '@/Interface';
import type {
	SharedBulkActionItemStatus,
	SharedBulkActionResult,
	SharedBulkActionResultItem,
} from '@/app/types/bulkActions.types';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

/** The only two resource kinds the workflow list can hold. */
export type BulkSelectableResource = WorkflowResource | FolderResource;

export type BulkActionId =
	| 'move'
	| 'archive'
	| 'unarchive'
	| 'share'
	| 'enableMcp'
	| 'disableMcp'
	| 'delete';

/** Mirrors the backend `BulkWorkflowActionItemStatus` so mocks/MCP normalize to the same buckets. */
export type BulkActionItemStatus = SharedBulkActionItemStatus;
export type BulkActionResultItem = SharedBulkActionResultItem<'workflow' | 'folder'>;
export type BulkActionResult = SharedBulkActionResult<'workflow' | 'folder'>;

/** Destination chosen in the Move review dialog. */
export type BulkMoveDestination = {
	projectId: string;
	projectName: string;
	folderId?: string;
	folderName?: string;
	changesOwnership: boolean;
};

/** Config a specific action gathers in its review dialog before confirmation. */
export type BulkActionConfig = {
	shareRecipients?: ProjectSharingData[];
	moveDestination?: BulkMoveDestination | null;
};

/**
 * Resolved, display-ready action derived from the current selection. `affected`
 * are the items that will change; `unchanged` are supported-but-idempotent
 * items partitioned into a "no change" group.
 */
export type ResolvedBulkAction = {
	id: BulkActionId;
	label: string;
	priority: number;
	destructive: boolean;
	/** At least one affected item and (for full-selection actions) the whole selection is valid. */
	enabled: boolean;
	affected: BulkSelectableResource[];
	unchanged: BulkSelectableResource[];
	/** Share/Move require gathering config before the confirm button enables. */
	needsConfig: boolean;
};
