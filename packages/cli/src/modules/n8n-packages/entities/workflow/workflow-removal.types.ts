import type { WorkflowPlanItem } from './workflow-import.types';
import type {
	FolderConflictPolicy,
	OverwriteDeletionPolicy,
	PackageImportSource,
	WorkflowRemovalFailure,
} from '../../n8n-packages.types';

/** What the package accounts for in one project scope, against which the target is reconciled. */
export interface WorkflowRemovalRequest {
	/** Decides whether reconciliation applies at all; only `overwrite` removes anything. */
	folderConflictPolicy: FolderConflictPolicy;
	deletionPolicy: OverwriteDeletionPolicy;
	/** The decided plan for the package's own workflows; their target ids are retained. */
	workflowItems: WorkflowPlanItem[];
	/** Folders the package defines. Workflows filed elsewhere are out of scope. */
	packageFolderIds: string[];
	/** Sub-workflow ids the package references but does not carry; retained so parents can publish. */
	subWorkflowRequirementIds?: string[];
	/** The project does not exist yet, so it holds nothing to reconcile against. */
	projectPendingCreation?: boolean;
	/** Git pulls reconcile all folders; package imports preserve folders they do not represent. */
	importSource?: PackageImportSource;
}

/** A workflow on the target that the package does not account for. */
export interface RemovableWorkflow {
	id: string;
	name: string;
	parentFolderId: string | null;
}

export interface WorkflowRemovalPlan {
	removals: RemovableWorkflow[];
	failures: WorkflowRemovalFailure[];
	deletionPolicy: OverwriteDeletionPolicy;
	/**
	 * Folders still holding a workflow once the removals above are done, so folder reconciliation
	 * knows which ones are not empty. Only populated when reconciliation is on.
	 */
	occupiedFolderIds: string[];
}
