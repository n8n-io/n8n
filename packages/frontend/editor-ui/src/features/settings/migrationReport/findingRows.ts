import type {
	BreakingChangeRuleDetailWorkflow,
	BreakingChangeWorkflowOwner,
	MigrationFindingListedStatus,
} from '@n8n/api-types';

type Row = BreakingChangeRuleDetailWorkflow;

/** Replaces the rows of the page with the result of `update`. */
export type UpdateRows = (update: (rows: Row[]) => Row[]) => void;

// Each function returns a new list, because the page keeps the rows in a shallow ref.

export function withStatuses(
	rows: Row[],
	statuses: Map<string, MigrationFindingListedStatus>,
): Row[] {
	return rows.map((row) => {
		const status = statuses.get(row.id);
		if (!status) return row;
		// Reopening drops the notified mark, as the server does.
		return status === 'open' ? { ...row, status, notifiedAt: undefined } : { ...row, status };
	});
}

/** Puts back the rows as they were before a failed change, notified date included. */
export function withRestored(rows: Row[], previous: Row[]): Row[] {
	const byId = new Map(previous.map((row) => [row.id, row]));
	return rows.map((row) => byId.get(row.id) ?? row);
}

// The server marks only an open or notified finding, so a fix that is not published keeps its state.
export function withNotified(rows: Row[], notifiedIds: string[], notifiedAt: Date): Row[] {
	const notified = new Set(notifiedIds);
	return rows.map((row) =>
		notified.has(row.id) && row.status !== 'fixed_unpublished'
			? { ...row, status: 'notified', notifiedAt }
			: row,
	);
}

// Archiving also unpublishes the workflow, as the server does.
export function withArchived(rows: Row[], archivedIds: ReadonlySet<string>): Row[] {
	return rows.map((row) =>
		archivedIds.has(row.id) ? { ...row, isArchived: true, active: false } : row,
	);
}

export function withOwner(
	rows: Row[],
	workflowId: string,
	owner: BreakingChangeWorkflowOwner | undefined,
): Row[] {
	return rows.map((row) => (row.id === workflowId ? { ...row, owner } : row));
}
