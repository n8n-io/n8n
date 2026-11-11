import type {
	BreakingChangeRuleDetailResult,
	BreakingChangeRuleDetailWorkflow,
	MigrationFindingTriageStatus,
} from '@n8n/api-types';
import { findingState, isBusy, isSelectable, isUnresolved, type RowContext } from './findingState';
import { matchesWorkflowFilters, UNUSED_WORKFLOW_FILTERS } from './workflowFilters';

type Row = BreakingChangeRuleDetailWorkflow;

/**
 * The selected rows that a bulk change to `status` would change. A notified
 * row counts as changeable to open, like in the row's own select: reopening
 * drops the notified mark.
 */
export function statusChangeTargets(
	selected: Row[],
	status: MigrationFindingTriageStatus,
	context: RowContext,
): Row[] {
	return selected.filter(
		(row) =>
			findingState(row, context) !== status && isSelectable(row, context) && !isBusy(row, context),
	);
}

export function archiveTargets(selected: Row[], context: RowContext): Row[] {
	return selected.filter(
		(row) => isSelectable(row, context) && !isBusy(row, context) && !row.isArchived,
	);
}

// Archiving unpublishes a workflow, and restoring it does not publish it again.
export function needsArchiveConfirmation(workflows: Row[]): boolean {
	return workflows.some((workflow) => workflow.active);
}

/**
 * On a rule whose executions will fail, a won't fix usually means the workflow is
 * not needed. On other rules the workflow often keeps running.
 */
export function shouldPromptToArchive(
	ruleImpact: BreakingChangeRuleDetailResult['ruleImpact'],
	workflow: Row,
): boolean {
	return ruleImpact === 'executionsFail' && !workflow.isArchived;
}

// An email goes to the owner, so a row without one has nobody to notify.
export function canNotifyRow(workflow: Row, context: RowContext, canNotify: boolean): boolean {
	return canNotify && !!workflow.owner?.email && isUnresolved(workflow, context);
}

export function notifyTargets(selected: Row[], context: RowContext, canNotify: boolean): Row[] {
	return selected.filter((row) => canNotifyRow(row, context, canNotify) && !isBusy(row, context));
}

// The backend sends one email per owner, listing all of their selected workflows.
export function notifyOwnerCount(targets: Row[]): number {
	return new Set(targets.map((workflow) => workflow.owner?.id)).size;
}

/** The open rows that did not run for 12 months, which the callout offers to mark won't fix. */
export function findUnusedOpenWorkflows(rows: Row[], context: RowContext, now = Date.now()): Row[] {
	return rows.filter(
		(row) =>
			!isBusy(row, context) &&
			matchesWorkflowFilters(row, UNUSED_WORKFLOW_FILTERS, now, findingState(row, context)),
	);
}
