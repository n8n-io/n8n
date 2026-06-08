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
 * A conflict policy's verdict for one workflow, given whether a version already
 * exists in the target. `blocked` marks a workflow that aborts a real import
 * (only the `fail` policy sets it).
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
	| ({ action: 'update'; existing: WorkflowEntity } & PreparedWorkflow)
	| ({ action: 'skip'; existing: WorkflowEntity } & PreparedWorkflow);

export interface WorkflowConflict {
	sourceWorkflowId: string;
	existingWorkflowId: string;
	name: string;
}

/**
 * The full decision a conflict policy made for a batch: the per-workflow action
 * to apply, plus any blocking conflicts that must abort a non-dry-run import.
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
