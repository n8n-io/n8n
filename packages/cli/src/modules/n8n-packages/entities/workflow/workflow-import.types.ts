import type { User, WorkflowEntity } from '@n8n/db';

import type { WorkflowIdConflict } from './workflow-import-match.service';
import type { WorkflowPublishingPolicy } from './workflow-publishing-policy.types';

/** The actor and destination a batch of workflows is imported into. */
export interface WorkflowImportContext {
	user: User;
	projectId: string;
	folderId: string | null;
	publishingPolicy: WorkflowPublishingPolicy;
}

export interface PreparedWorkflow {
	entity: WorkflowEntity;
	sourceWorkflowId: string;
	/** Whether the workflow was published (active) in the source instance. */
	sourcePublished: boolean;
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
 * `create` has none — no null checks needed downstream. `create` carries the
 * id the workflow will be written under (`decidedId`, per the id policy) so
 * the plan is the complete source-id → local-id map before anything is written.
 */
export type WorkflowPlanItem =
	| ({ action: 'create'; decidedId: string } & PreparedWorkflow)
	| ({ action: 'update'; existing: WorkflowEntity } & PreparedWorkflow)
	| ({ action: 'skip'; existing: WorkflowEntity } & PreparedWorkflow);

/** A plan item whose content is written to the database (i.e. not skipped). */
export type PersistedWorkflowPlanItem = Extract<WorkflowPlanItem, { action: 'create' | 'update' }>;

export interface WorkflowConflict {
	sourceWorkflowId: string;
	existingWorkflowId: string;
	name: string;
}

export interface WorkflowFolderConflict {
	sourceWorkflowId: string;
	existingWorkflowId: string;
	existingParentFolderId: string | null;
	targetFolderId: string;
	name: string;
}

/**
 * The planned actions for a batch of workflows, plus any conflicts that abort
 * the import before anything is written.
 */
export interface WorkflowImportPlan {
	items: WorkflowPlanItem[];
	conflicts: WorkflowConflict[];
	idConflicts: WorkflowIdConflict[];
	folderConflicts: WorkflowFolderConflict[];
}

export interface WorkflowImportOutcome {
	status: 'created' | 'updated' | 'skipped';
	workflow: WorkflowEntity;
	sourceWorkflowId: string;
}
