import type { PolicyViolation } from './schemas/policy-violation.schema';

/**
 * Response of `PUT /workflows/:workflowId/transfer` when the move could not republish the
 * workflow. Absent when the workflow kept its state.
 */
export type WorkflowTransferResult =
	/** The destination's policy refused the republish, so the move unpublished the workflow. */
	| { unpublishReasons: PolicyViolation[] }
	/** The republish failed for another reason, so the workflow is unpublished. */
	| { error: { name: string; message: string } };

/** A workflow that a folder move unpublished, with the reason its republish failed. */
export type UnpublishedWorkflow = {
	id: string;
	name: string;
} & WorkflowTransferResult;

/** Response of `PUT /projects/:projectId/folders/:folderId/transfer`. */
export type FolderTransferResult = {
	unpublishedWorkflows: UnpublishedWorkflow[];
};
