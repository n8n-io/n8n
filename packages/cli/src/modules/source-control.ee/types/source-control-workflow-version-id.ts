import type { IWorkflowSettings } from 'n8n-workflow';

import type { StatusResourceOwner } from './resource-owner';

export interface SourceControlWorkflowVersionId {
	id: string;
	versionId: string;
	filename: string;
	name?: string;
	/** `undefined` when the remote file predates description syncing. */
	description?: string | null;
	settings?: IWorkflowSettings | null;
	localId?: string;
	remoteId?: string;
	parentFolderId: string | null;
	updatedAt?: string;
	owner?: StatusResourceOwner;
	isRemoteArchived?: boolean;
}
