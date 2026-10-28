import type { PolicyViolation } from './schemas/policy-violation.schema';

/**
 * Advisory: what a move into another project would leave restricted. The move itself does
 * not read this.
 */
type TransferPreviewBase = {
	/** Types the destination project does not allow. */
	restricted: PolicyViolation[];
	/** A policy check failed, so the lists can be incomplete. */
	checkFailed: boolean;
};

/** Response of `GET /workflows/:workflowId/transfer-preview`. */
export type WorkflowTransferPreview = TransferPreviewBase & {
	/** Why the move would unpublish the workflow. Empty when it would not. */
	unpublishReasons: PolicyViolation[];
};

/** Response of `GET /projects/:projectId/folders/:folderId/transfer-preview`. */
export type FolderTransferPreview = TransferPreviewBase & {
	/** Published workflows in the folder tree that the move would unpublish. */
	workflowsToUnpublish: Array<{ id: string; name: string }>;
};

/** Response of `GET /credentials/:credentialId/transfer-preview`. */
export type CredentialTransferPreview = TransferPreviewBase;
