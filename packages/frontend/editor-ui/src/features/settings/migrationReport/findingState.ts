import type {
	BreakingChangeRuleDetailWorkflow,
	MigrationFindingListedStatus,
} from '@n8n/api-types';
import { TIME } from '@/app/constants';

/** The state that a row shows. A row that was migrated this session shows `migrated`. */
export type FindingState = MigrationFindingListedStatus | 'migrated';

/**
 * The workflows migrated this session. Filters and counts read only this, so a
 * save or a notification in flight does not recompute them.
 */
export interface MigrationContext {
	migratedIds: ReadonlySet<string>;
}

/** What the page knows about the rows that the server does not tell it. */
export interface RowContext extends MigrationContext {
	/** Rows with a state change in flight. One change at a time keeps the revert correct. */
	savingIds: ReadonlySet<string>;
	/** Rows with a notification in flight. Its response sets the status, so a state change must wait. */
	notifyingIds: ReadonlySet<string>;
}

// A workflow without a run in this period is probably not used any more.
const STALE_WORKFLOW_AFTER = 90 * TIME.DAY;

/**
 * A notified finding still needs a fix, and so does a fix that is not published,
 * so both count as open.
 */
export function isUnresolvedState(state: FindingState): boolean {
	return state === 'open' || state === 'notified' || state === 'fixed_unpublished';
}

export function findingState(
	workflow: BreakingChangeRuleDetailWorkflow,
	context: MigrationContext,
): FindingState {
	return context.migratedIds.has(workflow.id) ? 'migrated' : workflow.status;
}

// A migration fixes the finding on save, so a migrated row is not unresolved.
export function isUnresolved(
	workflow: BreakingChangeRuleDetailWorkflow,
	context: MigrationContext,
): boolean {
	return isUnresolvedState(findingState(workflow, context));
}

export function isBusy(workflow: BreakingChangeRuleDetailWorkflow, context: RowContext): boolean {
	return context.notifyingIds.has(workflow.id) || context.savingIds.has(workflow.id);
}

// A migrated row has no state to change, so it cannot be selected.
export function isSelectable(
	workflow: BreakingChangeRuleDetailWorkflow,
	context: MigrationContext,
): boolean {
	return !context.migratedIds.has(workflow.id);
}

export function isStale(workflow: BreakingChangeRuleDetailWorkflow, now = Date.now()): boolean {
	if (!workflow.lastExecutedAt) return false;
	return now - new Date(workflow.lastExecutedAt).getTime() > STALE_WORKFLOW_AFTER;
}

/** A copy of `ids` with `changed` added, or removed when `included` is false. */
export function withIds(
	ids: ReadonlySet<string>,
	changed: string[],
	included: boolean,
): Set<string> {
	const next = new Set(ids);
	for (const id of changed) {
		if (included) next.add(id);
		else next.delete(id);
	}
	return next;
}
