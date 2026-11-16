/**
 * Runs a validated batch of data table changes in the given order. The run
 * stops at the first failure and does not undo earlier changes, so the result
 * tells the model exactly which changes ran, which failed, and which it skipped.
 */
import { buildOwnedDataTableGrantKey } from '@n8n/api-types';
import { OperationalError, UnexpectedError } from '@n8n/errors';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import type { InstanceAiContext } from '../../types';
import type { DataTableChange } from './change-data-tables.schema';
import type {
	ChangePlan,
	PlannedChange,
	PlannedColumn,
	PlannedTable,
} from './change-data-tables.validate';
import { isNameConflictError } from './name-conflict';

type Action = DataTableChange['action'];
type ChangeOf<A extends Action> = Extract<DataTableChange, { action: A }>;
type TableChange = Exclude<DataTableChange, { action: 'create' }>;

/** What each action returns to the model. Kept small on purpose. */
interface ChangeSummaries {
	create: { columns: Array<{ name: string; type: string }> };
	delete: Record<string, never>;
	'add-column': { column: string };
	'delete-column': { column: string };
	'rename-column': { column: string; newName: string };
	'insert-rows': { insertedCount: number };
	'update-rows': { updatedCount: number };
	'delete-rows': { deletedCount: number };
}

export interface RunTable {
	id: string;
	name: string;
	projectId?: string;
}

type AppliedChangeOf<A extends Action> = {
	index: number;
	action: A;
	table: RunTable;
	result: ChangeSummaries[A];
};

/** Tied to `action`, so a reader of the result knows its shape. */
export type AppliedChange = { [A in Action]: AppliedChangeOf<A> }[Action];

export interface FailedChange {
	index: number;
	action: Action;
	error: string;
}

export interface RunChangesResult {
	success: boolean;
	applied: AppliedChange[];
	failed?: FailedChange;
	skipped: number[];
}

/** A table during the run. `columns` maps a column name to its ID once known. */
interface TableState extends RunTable {
	columns?: Map<string, string>;
	deleted?: boolean;
}

interface Run {
	context: InstanceAiContext;
	plan: ChangePlan;
	/** Tables that the batch creates, by the index of their create change. */
	created: Map<number, TableState>;
	existing: Map<string, TableState>;
	/** Tables of applied changes, in the order the run first changed them. */
	changed: Map<string, TableState>;
}

export async function runChanges(
	context: InstanceAiContext,
	plan: ChangePlan,
): Promise<RunChangesResult> {
	const run: Run = { context, plan, created: new Map(), existing: new Map(), changed: new Map() };
	const applied: AppliedChange[] = [];
	let failed: FailedChange | undefined;
	for (const planned of plan.changes) {
		try {
			applied.push(await runChange(run, planned));
		} catch (error) {
			logIfBug(context, planned, error);
			failed = toFailure(planned, error);
			break;
		}
	}
	await reportChangedTables(run);
	return toResult(plan, applied, failed);
}

function toResult(
	plan: ChangePlan,
	applied: AppliedChange[],
	failed: FailedChange | undefined,
): RunChangesResult {
	if (!failed) return { success: true, applied, skipped: [] };
	const skipped = plan.changes.map(({ index }) => index).filter((index) => index > failed.index);
	return { success: false, applied, failed, skipped };
}

/** A service refusal is for the model. A bug is also for the logs. */
function logIfBug(context: InstanceAiContext, { index, change }: PlannedChange, error: unknown) {
	if (!(error instanceof UnexpectedError)) return;
	context.logger.error('Data table change failed', { index, action: change.action, error });
}

function toFailure({ index, change }: PlannedChange, error: unknown): FailedChange {
	const message =
		change.action === 'create' && isNameConflictError(error)
			? `Table "${change.name}" already exists. Run list_data_tables through call_tool to find it, then run get_data_table_schema through call_tool to check its columns.`
			: getErrorMessage(error);
	return { index, action: change.action, error: message };
}

async function runChange(run: Run, planned: PlannedChange): Promise<AppliedChange> {
	const { index, change } = planned;
	if (change.action === 'create') return await createTable(run, index, change);
	const table = tableOf(run, planned.table);
	const applied = await runTableChange(run, table, planned, change);
	run.changed.set(table.id, table);
	return applied;
}

function appliedChange<A extends Action>(
	index: number,
	action: A,
	table: TableState,
	result: ChangeSummaries[A],
): AppliedChangeOf<A> {
	return { index, action, table: toRunTable(table), result };
}

function toRunTable({ id, name, projectId }: TableState): RunTable {
	return projectId === undefined ? { id, name } : { id, name, projectId };
}

function optionsFor(table: TableState) {
	return { projectId: table.projectId };
}

// ── Tables ─────────────────────────────────────────────────────────────────

async function createTable(run: Run, index: number, change: ChangeOf<'create'>) {
	const { context, plan } = run;
	const summary = await context.dataTableService.create(change.name, change.columns, {
		projectId: plan.projectId,
	});
	const table: TableState = {
		id: summary.id,
		name: summary.name,
		projectId: summary.projectId ?? plan.projectId,
		columns: new Map(summary.columns.map(({ name, id }) => [name, id])),
	};
	run.created.set(index, table);
	run.changed.set(table.id, table);
	await grantOwnership(context, table.id);
	const columns = summary.columns.map(({ name, type }) => ({ name, type }));
	return appliedChange(index, change.action, table, { columns });
}

/**
 * Later batches on a table this thread created need no card. The table exists
 * even if the grant fails, so the failure must not mark the create as failed.
 */
async function grantOwnership(context: InstanceAiContext, tableId: string) {
	try {
		await context.grantSessionToolApproval?.(buildOwnedDataTableGrantKey(tableId));
	} catch {
		// A lost grant only means that a later batch on the table shows a card.
	}
}

function tableOf(run: Run, planned: PlannedTable): TableState {
	if (planned.kind === 'created') {
		const table = run.created.get(planned.changeIndex);
		if (!table) throw new UnexpectedError(`Table "${planned.name}" was not created`);
		return table;
	}
	const known = run.existing.get(planned.id);
	if (known) return known;
	const projectId = planned.projectId ?? run.plan.projectId;
	const table: TableState = { id: planned.id, name: planned.name, projectId };
	run.existing.set(table.id, table);
	return table;
}

/** Tells the host which tables changed. A failed report must not hide what the batch did. */
async function reportChangedTables({ context, changed }: Run) {
	for (const table of changed.values()) {
		if (table.deleted) continue;
		try {
			await context.onArtifactChanged?.({ type: 'data-table', ...toRunTable(table) });
		} catch {
			// The changes already ran. The host only misses a tab update.
		}
	}
}

// ── Changes ────────────────────────────────────────────────────────────────

async function runTableChange(
	run: Run,
	table: TableState,
	{ index, column }: PlannedChange,
	change: TableChange,
): Promise<AppliedChange> {
	switch (change.action) {
		case 'delete':
			return appliedChange(index, change.action, table, await deleteTable(run, table));
		case 'add-column':
			return appliedChange(index, change.action, table, await addColumn(run, table, change));
		case 'delete-column':
			return appliedChange(index, change.action, table, await deleteColumn(run, table, column));
		case 'rename-column': {
			const result = await renameColumn(run, table, change, column);
			return appliedChange(index, change.action, table, result);
		}
		case 'insert-rows':
			return appliedChange(index, change.action, table, await insertRows(run, table, change));
		case 'update-rows':
			return appliedChange(index, change.action, table, await updateRows(run, table, change));
		case 'delete-rows':
			return appliedChange(index, change.action, table, await deleteRows(run, table, change));
		default: {
			const unhandled: never = change;
			throw new UnexpectedError(`Unknown data table change: ${JSON.stringify(unhandled)}`);
		}
	}
}

async function deleteTable(run: Run, table: TableState): Promise<ChangeSummaries['delete']> {
	await run.context.dataTableService.delete(table.id, optionsFor(table));
	table.deleted = true;
	return {};
}

async function addColumn(run: Run, table: TableState, change: ChangeOf<'add-column'>) {
	const column = await run.context.dataTableService.addColumn(
		table.id,
		{ name: change.column, type: change.type },
		optionsFor(table),
	);
	// Key by the requested name, because later changes in the batch use that name.
	(table.columns ??= new Map()).set(change.column, column.id);
	return { column: change.column };
}

async function deleteColumn(run: Run, table: TableState, column: PlannedColumn | undefined) {
	const target = requireColumn(column);
	const columnId = await columnIdOf(run, table, target);
	await run.context.dataTableService.deleteColumn(table.id, columnId, optionsFor(table));
	table.columns?.delete(target.name);
	return { column: target.name };
}

async function renameColumn(
	run: Run,
	table: TableState,
	change: ChangeOf<'rename-column'>,
	column: PlannedColumn | undefined,
) {
	const target = requireColumn(column);
	const columnId = await columnIdOf(run, table, target);
	const { newName } = change;
	await run.context.dataTableService.renameColumn(table.id, columnId, newName, optionsFor(table));
	table.columns?.delete(target.name);
	// A new map holds only this column. A later miss on another column reads the schema.
	(table.columns ??= new Map()).set(newName, columnId);
	return { column: target.name, newName };
}

async function insertRows(run: Run, table: TableState, change: ChangeOf<'insert-rows'>) {
	const { dataTableService } = run.context;
	const result = await dataTableService.insertRows(table.id, change.rows, optionsFor(table));
	return { insertedCount: result.insertedCount };
}

async function updateRows(run: Run, table: TableState, change: ChangeOf<'update-rows'>) {
	const { dataTableService } = run.context;
	const { filter, data } = change;
	const result = await dataTableService.updateRows(table.id, filter, data, optionsFor(table));
	return { updatedCount: result.updatedCount };
}

async function deleteRows(run: Run, table: TableState, change: ChangeOf<'delete-rows'>) {
	const { dataTableService } = run.context;
	const result = await dataTableService.deleteRows(table.id, change.filter, optionsFor(table));
	return { deletedCount: result.deletedCount };
}

// ── Columns ────────────────────────────────────────────────────────────────

function requireColumn(column: PlannedColumn | undefined): PlannedColumn {
	if (!column) throw new UnexpectedError('The plan has no column for a column change');
	return column;
}

/**
 * Existing columns have an ID in the plan. Columns that the batch adds get
 * their ID from the create or add-column result, else from a fresh schema read.
 */
async function columnIdOf(run: Run, table: TableState, column: PlannedColumn) {
	return column.id ?? table.columns?.get(column.name) ?? (await readColumnId(run, table, column));
}

async function readColumnId(run: Run, table: TableState, column: PlannedColumn) {
	const schema = await run.context.dataTableService.getSchema(table.id, optionsFor(table));
	table.columns = new Map(schema.map(({ name, id }) => [name, id]));
	const id = table.columns.get(column.name);
	// Someone may have dropped the column since validation. That is not a bug.
	if (id === undefined) {
		throw new OperationalError(`Table "${table.name}" has no column "${column.name}"`);
	}
	return id;
}
