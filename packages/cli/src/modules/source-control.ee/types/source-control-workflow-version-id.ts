import type { IWorkflowSettings } from 'n8n-workflow';

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
	isRemoteArchived?: boolean;
	/**
	 * Workflow settings from the DB / exported file. Settings-only edits (e.g.
	 * `availableInMCP`) do not bump `versionId`, so status must compare these.
	 */
	settings?: IWorkflowSettings;
}
