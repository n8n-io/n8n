import type { WorkflowEntity } from '@n8n/db';

import type { WorkflowIdConflict } from './workflow-import-match.service';
import type {
	WorkflowPublishingOutcome,
	WorkflowPublishingPolicy,
} from './workflow-publishing-policy.types';
import type { ImportContext } from '../../n8n-packages.types';

/** Apply-time context for the workflow importer: the resolved import target plus apply-only inputs. */
export interface WorkflowImportContext extends ImportContext {
	publishingPolicy: WorkflowPublishingPolicy;
	/** Package workflow ids that must stay inactive because they use stubbed credentials. */
	publishBlockedSourceWorkflowIds: ReadonlySet<string>;
}

export interface PreparedWorkflow {
	entity: WorkflowEntity;
	sourceWorkflowId: string;
	/** Whether the workflow was published (active) in the source instance. */
	sourcePublished: boolean;
	/**
	 * Source id of the package folder this workflow is nested under or null for a scope-root workflow that lands in the request's
	 * target folder.
	 */
	parentFolderId: string | null;
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
	publishing: WorkflowPublishingOutcome;
}
