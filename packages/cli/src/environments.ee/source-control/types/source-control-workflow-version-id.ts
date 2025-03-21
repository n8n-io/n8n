export interface SourceControlWorkflowVersionId {
	id: string;
	versionId: string;
	filename: string;
	name?: string;
	localId?: string;
	remoteId?: string;
	parentFolderId: string | null;
	updatedAt?: string;
}
