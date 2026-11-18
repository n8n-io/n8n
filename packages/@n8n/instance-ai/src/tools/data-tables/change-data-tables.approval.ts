/**
 * Decides whether a batch of data table changes needs the user's approval, and
 * builds the one card that lists every change of the batch.
 */
import {
	buildOwnedDataTableGrantKey,
	DATA_TABLE_CHANGE_SEVERITY,
	isSessionGrantableDataTableAction,
} from '@n8n/api-types';
import type {
	DataTableWriteToolAction,
	InstanceAiApprovalDetails,
	InstanceAiConfirmationSeverity,
	InstanceAiDataTableChangeDetails,
} from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import { nanoid } from 'nanoid';

import type { InstanceAiContext } from '../../types';
import { hasSessionGrant, type ConfirmationSuspendPayload } from './confirmation';
import {
	DATA_TABLE_CHANGE_PERMISSION,
	type ChangePlan,
	type PlannedChange,
	type PlannedTable,
} from './change-data-tables.validate';
import {
	MAX_DESCRIBED_ROWS,
	describeRowFilter,
	pluralize,
	previewRow,
	type RowFilter,
} from './preview';

const SEVERITY_RANK = { info: 0, warning: 1, destructive: 2 } as const satisfies Record<
	InstanceAiConfirmationSeverity,
	number
>;

// ── Decision ───────────────────────────────────────────────────────────────

/** True when at least one change of the batch needs the user's approval. */
export function batchNeedsApproval(context: InstanceAiContext, plan: ChangePlan): boolean {
	return plan.changes.some((planned) => changeNeedsApproval(context, planned));
}

function changeNeedsApproval(context: InstanceAiContext, { change, table }: PlannedChange) {
	const { action } = change;
	if (context.permissions?.[DATA_TABLE_CHANGE_PERMISSION[action]] === 'always_allow') return false;
	if (hasSessionGrant(context, action)) return false;
	// Owning a table covers its columns and rows, not creating or deleting the table.
	if (action === 'create' || action === 'delete') return true;
	return !isOwnedTable(context, table);
}

/** The thread owns tables that it created, in this batch or in an earlier one. */
function isOwnedTable(context: InstanceAiContext, table: PlannedTable): boolean {
	if (table.kind === 'created') return true;
	return context.sessionApprovedToolKeys?.has(buildOwnedDataTableGrantKey(table.id)) === true;
}

/**
 * Actions that an approval for the session may cover. The UI offers no session approval
 * on a destructive card, so the backend never grants a destructive action either.
 */
export function sessionGrantableActions(plan: ChangePlan): DataTableWriteToolAction[] {
	const actions = new Set(plan.changes.map(({ change }) => change.action));
	return [...actions].filter(isSessionGrantableDataTableAction);
}

// ── Card ───────────────────────────────────────────────────────────────────

export function buildApprovalRequest(plan: ChangePlan): ConfirmationSuspendPayload {
	return {
		requestId: nanoid(),
		message: plan.changes.map(describeChange).join('\n'),
		approvalDetails: {
			action: 'data-table-changes',
			changes: plan.changes.map((planned) => ({
				tableName: planned.table.name,
				tableKey: tableKey(planned.table),
				details: buildDetails(planned),
			})),
		} satisfies InstanceAiApprovalDetails,
		resourceName: describeTables(plan),
		severity: highestSeverity(plan),
	};
}

function highestSeverity(plan: ChangePlan): InstanceAiConfirmationSeverity {
	return plan.changes
		.map(({ change }) => DATA_TABLE_CHANGE_SEVERITY[change.action])
		.reduce<InstanceAiConfirmationSeverity>(
			(highest, next) => (SEVERITY_RANK[next] > SEVERITY_RANK[highest] ? next : highest),
			'info',
		);
}

/** The table name when the batch changes one table, otherwise the number of tables. */
function describeTables(plan: ChangePlan): string {
	const tables = new Map(plan.changes.map(({ table }) => [tableKey(table), table.name]));
	const [only] = tables.values();
	return tables.size === 1 ? only : `${tables.size} tables`;
}

/** Stable within the batch: an existing table by ID, a new table by the change that creates it. */
function tableKey(table: PlannedTable): string {
	return table.kind === 'existing' ? `existing:${table.id}` : `created:${table.changeIndex}`;
}

/**
 * Card details use column names, not IDs, so the user can read them. `create` and
 * `delete` map to `create-table` and `delete-table` on purpose: the batch card reuses
 * the variants of the single-table cards.
 */
function buildDetails({ change, column }: PlannedChange): InstanceAiDataTableChangeDetails {
	switch (change.action) {
		case 'create':
			return {
				action: 'create-table',
				columns: change.columns.map(({ name, type }) => ({ name, columnType: type })),
			};
		case 'delete':
			return { action: 'delete-table' };
		case 'add-column':
			return { action: 'add-column', column: change.column, columnType: change.type };
		case 'delete-column':
			return { action: 'delete-column', column: column?.name ?? change.column };
		case 'rename-column':
			return {
				action: 'rename-column',
				column: column?.name ?? change.column,
				newName: change.newName,
			};
		case 'insert-rows':
			return {
				action: 'insert-rows',
				count: change.rows.length,
				rows: change.rows.slice(0, MAX_DESCRIBED_ROWS).map(previewRow),
			};
		case 'update-rows':
			return { action: 'update-rows', changes: previewRow(change.data), filter: change.filter };
		case 'delete-rows':
			return { action: 'delete-rows', filter: change.filter };
		default: {
			const unhandled: never = change;
			throw new UnexpectedError(`Unknown data table change: ${JSON.stringify(unhandled)}`);
		}
	}
}

/** One plain-text line for each change. Clients that cannot show the card show this text. */
function describeChange({ change, table, column }: PlannedChange): string {
	const name = `"${table.name}"`;
	switch (change.action) {
		case 'create':
			return `Create table ${name} with ${change.columns.length} ${pluralize(change.columns.length, 'column')}`;
		case 'delete':
			return `Delete table ${name} and all its rows`;
		case 'add-column':
			return `Add column "${change.column}" (${change.type}) to ${name}`;
		case 'delete-column':
			return `Delete column "${column?.name ?? change.column}" from ${name}`;
		case 'rename-column':
			return `Rename column "${column?.name ?? change.column}" in ${name} to "${change.newName}"`;
		case 'insert-rows':
			return `Add ${change.rows.length} ${pluralize(change.rows.length, 'row')} to ${name}`;
		case 'update-rows':
			return `Update rows in ${name}${describeWhere(change.filter)}`;
		case 'delete-rows':
			return `Delete rows from ${name}${describeWhere(change.filter)}`;
		default: {
			const unhandled: never = change;
			throw new UnexpectedError(`Unknown data table change: ${JSON.stringify(unhandled)}`);
		}
	}
}

function describeWhere(filter: RowFilter): string {
	return filter.filters.length === 0 ? ' (all rows)' : ` where ${describeRowFilter(filter)}`;
}
