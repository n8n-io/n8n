/**
 * Checks a batch of data table changes before the user sees an approval card.
 * It walks the changes in order over a simulated view of the tables, so a
 * change can use a table or column that an earlier change in the batch adds.
 *
 * Contradictions rejected here:
 * - two creates with the same table name, unless a change between them deletes the first table
 * - any change to a table after a change that deletes it
 * - deleting a column that an earlier change in the batch adds
 * - adding a column whose name already exists
 * - renaming a column to a name that already exists
 *
 * Rows that an insert or update writes, and row filters, may only name columns
 * that the table has at that point in the batch. Filters may also use the
 * system columns (`id`, `createdAt`, `updatedAt`), which rows cannot write.
 */
import type { DataTableWriteToolAction, InstanceAiPermissions } from '@n8n/api-types';
import { UnexpectedError, UserError } from '@n8n/errors';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import type {
	DataTableReference,
	DataTableReferencePermission,
	InstanceAiContext,
} from '../../types';
import type { ChangeDataTablesInput, DataTableChange } from './change-data-tables.schema';

/** The permission that controls each change action. */
export const DATA_TABLE_CHANGE_PERMISSION = {
	create: 'createDataTable',
	delete: 'deleteDataTable',
	'add-column': 'mutateDataTableSchema',
	'delete-column': 'mutateDataTableSchema',
	'rename-column': 'mutateDataTableSchema',
	'insert-rows': 'mutateDataTableRows',
	'update-rows': 'mutateDataTableRows',
	'delete-rows': 'mutateDataTableRows',
} as const satisfies Record<DataTableWriteToolAction, keyof InstanceAiPermissions>;

type TableChange = Exclude<DataTableChange, { action: 'create' }>;

/** The permission that the table lookup checks for each change on an existing table. */
const REFERENCE_PERMISSION = {
	delete: 'delete',
	'add-column': 'update',
	'delete-column': 'update',
	'rename-column': 'update',
	'insert-rows': 'writeRow',
	'update-rows': 'writeRow',
	'delete-rows': 'writeRow',
} as const satisfies Record<TableChange['action'], DataTableReferencePermission>;

/** A table used as is, without a resolver, has no known project. */
type ExistingTableReference = Omit<DataTableReference, 'projectId'> &
	Partial<Pick<DataTableReference, 'projectId'>>;

export type PlannedTable =
	| ({ kind: 'existing' } & ExistingTableReference)
	| { kind: 'created'; name: string; changeIndex: number };

/** A column that a column change targets. Columns that the batch adds have no ID yet. */
export interface PlannedColumn {
	name: string;
	id?: string;
}

export interface PlannedChange {
	index: number;
	change: DataTableChange;
	table: PlannedTable;
	column?: PlannedColumn;
}

export interface ChangePlan {
	projectId?: string;
	changes: PlannedChange[];
}

export type ChangeValidationFailure =
	| { denied: true; reason: string }
	| { success: false; error: string; changeIndex?: number };

export type ChangeValidationResult =
	| { ok: true; plan: ChangePlan }
	| { ok: false; error: ChangeValidationFailure };

/** A rejected change. Thrown inside the walk and turned into a result at the top. */
class InvalidChangeError extends UserError {
	constructor(
		readonly changeIndex: number,
		problem: string,
	) {
		const change = `changes[${changeIndex}]`;
		super(`${change}: ${problem} Fix ${change} and call the tool again with the whole batch.`);
	}
}

/** What the batch knows about one table after the changes walked so far. */
interface TableView {
	table: PlannedTable;
	/** Current column name → column ID. IDs are unknown for columns that the batch adds. */
	columns?: Map<string, string | undefined>;
	addedColumns: Set<string>;
	deletedAt?: number;
}

interface BatchView {
	context: InstanceAiContext;
	projectId?: string;
	created: Map<string, TableView>;
	existing: Map<string, TableView>;
	/** Keyed by permission and table reference. */
	references: Map<string, DataTableReference>;
}

type AppliedChange = Pick<PlannedChange, 'table' | 'column'>;

export async function validateChanges(
	context: InstanceAiContext,
	input: ChangeDataTablesInput,
): Promise<ChangeValidationResult> {
	const blocked = findBlockedChange(context, input.changes);
	if (blocked) return { ok: false, error: blocked };
	try {
		return { ok: true, plan: await walkChanges(context, input) };
	} catch (error) {
		if (!(error instanceof InvalidChangeError)) throw error;
		return {
			ok: false,
			error: { success: false, error: error.message, changeIndex: error.changeIndex },
		};
	}
}

function findBlockedChange(
	context: InstanceAiContext,
	changes: DataTableChange[],
): ChangeValidationFailure | undefined {
	const index = changes.findIndex(
		({ action }) => context.permissions?.[DATA_TABLE_CHANGE_PERMISSION[action]] === 'blocked',
	);
	if (index === -1) return undefined;
	const reason = `changes[${index}] ("${changes[index].action}") is blocked by an admin, so no change ran. Remove it and call the tool again with the other changes.`;
	return { denied: true, reason };
}

async function walkChanges(
	context: InstanceAiContext,
	input: ChangeDataTablesInput,
): Promise<ChangePlan> {
	const view: BatchView = {
		context,
		projectId: input.projectId,
		created: new Map(),
		existing: new Map(),
		references: new Map(),
	};
	const changes: PlannedChange[] = [];
	for (const [index, change] of input.changes.entries()) {
		changes.push({ index, change, ...(await applyChange(view, index, change)) });
	}
	return { projectId: input.projectId, changes };
}

async function applyChange(
	view: BatchView,
	index: number,
	change: DataTableChange,
): Promise<AppliedChange> {
	if (change.action === 'create') return { table: applyCreate(view, index, change) };
	const table = await findTable(view, index, change);
	return { table: table.table, ...(await applyTableChange(view, table, index, change)) };
}

async function applyTableChange(
	view: BatchView,
	table: TableView,
	index: number,
	change: TableChange,
): Promise<Pick<PlannedChange, 'column'>> {
	switch (change.action) {
		case 'delete':
			table.deletedAt = index;
			return {};
		case 'add-column':
			return { column: await applyAddColumn(view, table, index, change.column) };
		case 'delete-column':
			return { column: await applyDeleteColumn(view, table, index, change.column) };
		case 'rename-column':
			return { column: await applyRenameColumn(view, table, index, change) };
		case 'insert-rows':
			await assertWritableColumns(
				view,
				table,
				index,
				change.rows.flatMap((row) => Object.keys(row)),
			);
			return {};
		case 'update-rows':
			await assertWritableColumns(view, table, index, Object.keys(change.data));
			await assertFilterColumnsExist(view, table, index, change.filter);
			return {};
		case 'delete-rows':
			await assertFilterColumnsExist(view, table, index, change.filter);
			return {};
		default: {
			const unhandled: never = change;
			throw new UnexpectedError(`Unknown data table change: ${JSON.stringify(unhandled)}`);
		}
	}
}

// ── Tables ─────────────────────────────────────────────────────────────────

function applyCreate(
	view: BatchView,
	index: number,
	change: Extract<DataTableChange, { action: 'create' }>,
): PlannedTable {
	const earlier = view.created.get(change.name);
	if (earlier && earlier.deletedAt === undefined) {
		throw new InvalidChangeError(
			index,
			`An earlier change already creates table "${change.name}".`,
		);
	}
	const table: PlannedTable = { kind: 'created', name: change.name, changeIndex: index };
	const columns = new Map(change.columns.map(({ name }) => [name, undefined]));
	view.created.set(change.name, { table, columns, addedColumns: new Set() });
	return table;
}

/** A name of a table created earlier in the batch wins over a lookup. */
async function findTable(view: BatchView, index: number, change: TableChange) {
	const ref = change.table;
	const table =
		view.created.get(ref) ??
		(await findExistingTable(view, index, ref, REFERENCE_PERMISSION[change.action]));
	if (table.deletedAt !== undefined) {
		throw new InvalidChangeError(
			index,
			`changes[${table.deletedAt}] deletes table "${ref}", so no later change can use it.`,
		);
	}
	return table;
}

async function findExistingTable(
	view: BatchView,
	index: number,
	ref: string,
	permission: DataTableReferencePermission,
): Promise<TableView> {
	const reference = await resolveReference(view, index, ref, permission);
	const known = view.existing.get(reference.id);
	if (known) return known;
	await view.context.assertInThreadProject?.({
		kind: 'data-table',
		id: reference.id,
		projectId: reference.projectId,
	});
	const table: TableView = { table: { kind: 'existing', ...reference }, addedColumns: new Set() };
	view.existing.set(reference.id, table);
	return table;
}

/** Without a resolver the service cannot look up the table, so the reference is used as is. */
async function resolveReference(
	view: BatchView,
	index: number,
	ref: string,
	permission: DataTableReferencePermission,
): Promise<ExistingTableReference> {
	const key = `${permission}:${ref}`;
	const cached = view.references.get(key);
	if (cached) return cached;
	const resolve = view.context.dataTableService.resolveTableReference;
	if (!resolve) return { id: ref, name: ref, projectId: view.projectId };
	const options = { projectId: view.projectId, permission };
	const reference = await guardLookup(index, async () => await resolve(ref, options));
	view.references.set(key, reference);
	return reference;
}

// ── Lookup failures ────────────────────────────────────────────────────────

/** The service throws a user error for a table it cannot find or pick; other failures are not the model's to fix. */
function describeLookupFailure(error: unknown): string | undefined {
	return error instanceof UserError ? error.message.replace(/\.$/, '') : undefined;
}

async function guardLookup<T>(index: number, lookUp: () => Promise<T>): Promise<T> {
	try {
		return await lookUp();
	} catch (error) {
		const problem = describeLookupFailure(error);
		if (problem === undefined) throw error;
		throw new InvalidChangeError(
			index,
			`${problem}. If the table does not exist yet, create it earlier in the batch.`,
		);
	}
}

// ── Columns ────────────────────────────────────────────────────────────────

/** Reads the columns of an existing table once, when a change first needs them. */
async function loadColumns(view: BatchView, table: TableView, index: number) {
	if (table.columns) return table.columns;
	const planned = table.table;
	if (planned.kind !== 'existing') return (table.columns = new Map());
	const { getSchema } = view.context.dataTableService;
	const options = { projectId: planned.projectId };
	const schema = await guardLookup(index, async () => await getSchema(planned.id, options));
	table.columns = new Map(schema.map(({ name, id }) => [name, id]));
	return table.columns;
}

function missingColumnError(table: TableView, index: number, name: string) {
	return new InvalidChangeError(
		index,
		`Table "${table.table.name}" has no column "${name}" at this point in the batch. Add the column in an earlier change, or run get_data_table_schema to check its columns.`,
	);
}

/** Finds a column by name, or by ID for columns that already exist. */
async function findColumn(
	view: BatchView,
	table: TableView,
	index: number,
	ref: string,
): Promise<PlannedColumn> {
	const columns = await loadColumns(view, table, index);
	const match = columns.has(ref)
		? toColumn(ref, columns.get(ref))
		: [...columns].filter(([, id]) => id === ref).map(([name, id]) => toColumn(name, id))[0];
	if (!match) throw missingColumnError(table, index, ref);
	return match;
}

function toColumn(name: string, id: string | undefined): PlannedColumn {
	return id === undefined ? { name } : { name, id };
}

async function assertColumnNameFree(
	view: BatchView,
	table: TableView,
	index: number,
	name: string,
) {
	const columns = await loadColumns(view, table, index);
	if (!columns.has(name)) return columns;
	throw new InvalidChangeError(
		index,
		`Table "${table.table.name}" already has a column "${name}". Pick another name.`,
	);
}

async function assertColumnsExist(
	view: BatchView,
	table: TableView,
	index: number,
	names: string[],
	allowed: readonly string[] = [],
) {
	const columns = await loadColumns(view, table, index);
	const missing = names.find((name) => !columns.has(name) && !allowed.includes(name));
	if (missing !== undefined) throw missingColumnError(table, index, missing);
}

/** Rows may set only the table's own columns, never the system columns. */
async function assertWritableColumns(
	view: BatchView,
	table: TableView,
	index: number,
	names: string[],
) {
	const system = names.find((name) => DATA_TABLE_SYSTEM_COLUMNS.includes(name));
	if (system !== undefined) {
		throw new InvalidChangeError(
			index,
			`"${system}" is a system column. Its values are set by n8n and cannot be written. Remove it from the row values.`,
		);
	}
	await assertColumnsExist(view, table, index, names);
}

async function assertFilterColumnsExist(
	view: BatchView,
	table: TableView,
	index: number,
	filter: { filters: Array<{ columnName: string }> },
) {
	const names = filter.filters.map(({ columnName }) => columnName);
	await assertColumnsExist(view, table, index, names, DATA_TABLE_SYSTEM_COLUMNS);
}

async function applyAddColumn(view: BatchView, table: TableView, index: number, name: string) {
	const columns = await assertColumnNameFree(view, table, index, name);
	columns.set(name, undefined);
	table.addedColumns.add(name);
	return { name };
}

async function applyDeleteColumn(view: BatchView, table: TableView, index: number, ref: string) {
	const column = await findColumn(view, table, index, ref);
	if (table.addedColumns.has(column.name)) {
		throw new InvalidChangeError(
			index,
			`An earlier change in this batch adds column "${column.name}". Remove both changes instead.`,
		);
	}
	table.columns?.delete(column.name);
	return column;
}

async function applyRenameColumn(
	view: BatchView,
	table: TableView,
	index: number,
	change: Extract<DataTableChange, { action: 'rename-column' }>,
) {
	const column = await findColumn(view, table, index, change.column);
	const columns = await assertColumnNameFree(view, table, index, change.newName);
	columns.set(change.newName, column.id);
	columns.delete(column.name);
	if (table.addedColumns.delete(column.name)) table.addedColumns.add(change.newName);
	return column;
}
