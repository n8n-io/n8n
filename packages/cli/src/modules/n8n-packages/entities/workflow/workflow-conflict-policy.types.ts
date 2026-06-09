import type { User, WorkflowEntity } from '@n8n/db';

export interface WorkflowMatchContext {
	user: User;
	projectId: string;
	folderId: string | null;
}

export interface WorkflowImportOutcome {
	status: 'created' | 'updated' | 'skipped';
	workflow: WorkflowEntity;
	sourceWorkflowId: string;
}

export interface PreparedWorkflow {
	entity: WorkflowEntity;
	sourceWorkflowId: string;
	/**
	 * Source workflow's published (active) version id, captured before deserialize
	 * drops it; null when the source was never published. Needed for the publishing policy.
	 */
	sourcePublishedId: string | null;
}

export interface WorkflowConflict {
	sourceWorkflowId: string;
	existingWorkflowId: string;
	name: string;
}
