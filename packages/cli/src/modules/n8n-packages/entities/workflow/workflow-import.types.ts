import type { User, WorkflowEntity } from '@n8n/db';

/** The actor and destination a batch of workflows is imported into. */
export interface WorkflowImportContext {
	user: User;
	projectId: string;
	folderId: string | null;
}

export interface PreparedWorkflow {
	entity: WorkflowEntity;
	sourceWorkflowId: string;
}

export type WorkflowPlannedAction = 'create' | 'update' | 'skip';

/**
 * A conflict policy's verdict for one workflow. `blocked` aborts the import and
 * is set only by the `fail` policy.
 */
export interface WorkflowDecision {
	action: WorkflowPlannedAction;
	blocked: boolean;
}

/**
 * The decided plan for one workflow. Discriminated by `action` so that
 * `update`/`skip` carry the pre-existing workflow they operate on, while
 * `create` has none — no null checks needed downstream.
 */
export type WorkflowPlanItem =
	| ({ action: 'create' } & PreparedWorkflow)
	| ({ action: 'update' | 'skip'; existing: WorkflowEntity } & PreparedWorkflow);

export interface WorkflowConflict {
	sourceWorkflowId: string;
	existingWorkflowId: string;
	name: string;
}

/**
 * The planned actions for a batch of workflows, plus any conflicts that abort
 * the import before anything is written.
 */
export interface WorkflowImportPlan {
	items: WorkflowPlanItem[];
	conflicts: WorkflowConflict[];
}

export interface WorkflowImportOutcome {
	status: 'created' | 'updated' | 'skipped';
	workflow: WorkflowEntity;
	sourceWorkflowId: string;
}
