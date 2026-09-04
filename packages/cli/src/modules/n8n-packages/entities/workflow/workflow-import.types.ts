import type { WorkflowEntity } from '@n8n/db';

import type { WorkflowArchiveTransition } from './workflow-archive-transition';
import type { WorkflowIdConflict, WorkflowLineageConflict } from './workflow-import-match.service';
import type {
	WorkflowPublishingBlockedReason,
	WorkflowPublishingOutcome,
} from './workflow-publishing-policy.types';
import type { ImportContext } from '../../n8n-packages.types';

/** Apply-time context for the workflow importer: the resolved import target plus apply-only inputs. */
export interface WorkflowImportContext extends ImportContext {
	/** Tag ids the tag plan dropped; stripped from every workflow's `tagIds` before attaching. */
	droppedTagIds: ReadonlySet<string>;
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
	/**
	 * Source tag ids from the package's `workflow.json`. When present (even
	 * empty) an update overwrites the target workflow's taggings to exactly
	 * this set; when absent, taggings are left untouched.
	 */
	tagIds?: string[];
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
 * `update` carries the archive step needed when the package and the target
 * disagree on the archived state.
 */
export type WorkflowPlanItem =
	| ({ action: 'create'; decidedId: string } & PreparedWorkflow)
	| ({
			action: 'update';
			existing: WorkflowEntity;
			archiveTransition: WorkflowArchiveTransition | null;
	  } & PreparedWorkflow)
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

/** A matched workflow the import must archive or unarchive, but the user lacks `workflow:delete` on. */
export interface WorkflowArchiveForbidden {
	sourceWorkflowId: string;
	existingWorkflowId: string;
	name: string;
	projectId: string;
	transition: WorkflowArchiveTransition;
}

/**
 * The planned actions for a batch of workflows, plus any conflicts that abort
 * the import before anything is written.
 */
export interface WorkflowImportPlan {
	items: WorkflowPlanItem[];
	conflicts: WorkflowConflict[];
	lineageConflicts: WorkflowLineageConflict[];
	idConflicts: WorkflowIdConflict[];
	folderConflicts: WorkflowFolderConflict[];
	archiveForbidden: WorkflowArchiveForbidden[];
}

export interface WorkflowImportOutcome {
	status: 'created' | 'updated' | 'skipped';
	workflow: WorkflowEntity;
	sourceWorkflowId: string;
	publishing: WorkflowPublishingOutcome;
}

/**
 * A workflow written to the database, awaiting the package-wide publish sweep. Discriminated so
 * only the written actions carry what the sweep needs; a skipped workflow is never published and
 * keeps whatever state it already had.
 */
export type PersistedWorkflowOutcome =
	| { status: 'skipped'; workflow: WorkflowEntity; sourceWorkflowId: string }
	| {
			status: 'created' | 'updated';
			workflow: WorkflowEntity;
			sourceWorkflowId: string;
			item: PersistedWorkflowPlanItem;
			/**
			 * Why this workflow must stay inactive even if the policy wants it published — it depends on
			 * a credential that was stubbed, or a node type this instance does not have.
			 */
			blockedFromPublish?: WorkflowPublishingBlockedReason;
	  };
