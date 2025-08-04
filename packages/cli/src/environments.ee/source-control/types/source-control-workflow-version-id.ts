import type { StatusResourceOwner } from './resource-owner';

export interface SourceControlWorkflowVersionId {
	id: string;
	versionId: string;
	filename: string;
	name?: string;
	localId?: string;
	remoteId?: string;
	parentFolderId: string | null;
	updatedAt?: string;
	owner?: StatusResourceOwner;
}
