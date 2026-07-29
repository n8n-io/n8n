import type { WorkflowPlanItem } from './workflow-import.types';
import type { OverwriteDeletionPolicy, WorkflowRemovalFailure } from '../../n8n-packages.types';

/** What the package accounts for in one project scope, against which the target is reconciled. */
export interface WorkflowRemovalRequest {
	/** The decided plan for the package's own workflows; their target ids are retained. */
	workflowItems: WorkflowPlanItem[];
	/** Folders the package defines. Workflows filed elsewhere are out of scope. */
	packageFolderIds: string[];
	/** Sub-workflow ids the package references but does not carry; retained so parents can publish. */
	subWorkflowRequirementIds?: string[];
	deletionPolicy: OverwriteDeletionPolicy;
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
}
