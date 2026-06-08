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
	/** Wire 'active' before deserialize drops it; needed for workflowPublishingPolicy. */
	sourceActive: boolean;
}

export interface WorkflowConflict {
	sourceWorkflowId: string;
	existingWorkflowId: string;
	name: string;
}
