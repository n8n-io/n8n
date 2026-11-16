/**
 * Checks a batch of data table changes before the user sees an approval card.
 * It walks the changes in order over a simulated view of the tables, so a
 * change can use a table or column that an earlier change in the batch adds.
 *
 * Contradictions rejected here:
 * - two creates with the same table name
 * - any change to a table after a change that deletes it
 * - deleting a column that an earlier change in the batch adds
 * - adding a column whose name already exists
 * - renaming a column to a name that already exists
 */
import type { DataTableWriteToolAction, InstanceAiPermissions } from '@n8n/api-types';
import { UserError } from '@n8n/errors';

import type { DataTableReference, InstanceAiContext } from '../../types';
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

export type PlannedTable =
	| { kind: 'existing'; id: string; name: string; projectId?: string }
	| { kind: 'created'; name: string; changeIndex: number };

export interface PlannedChange {
	index: number;
	change: DataTableChange;
	table: PlannedTable;
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
	references: Map<string, DataTableReference>;
}

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
		changes.push({ index, change, table: await applyChange(view, index, change) });
	}
	return { projectId: input.projectId, changes };
}

async function applyChange(
	view: BatchView,
	index: number,
	change: DataTableChange,
): Promise<PlannedTable> {
	if (change.action === 'create') return applyCreate(view, index, change);
	const table = await findTable(view, index, change.table);
	if (change.action === 'delete') table.deletedAt = index;
	if (change.action === 'add-column') await applyAddColumn(view, table, index, change.column);
	if (change.action === 'delete-column') await applyDeleteColumn(view, table, index, change.column);
	if (change.action === 'rename-column') await applyRenameColumn(view, table, index, change);
	return table.table;
}

// ── Tables ─────────────────────────────────────────────────────────────────

function applyCreate(
	view: BatchView,
	index: number,
	change: Extract<DataTableChange, { action: 'create' }>,
): PlannedTable {
	if (view.created.has(change.name)) {
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
async function findTable(view: BatchView, index: number, ref: string): Promise<TableView> {
	const table = view.created.get(ref) ?? (await findExistingTable(view, index, ref));
	if (table.deletedAt !== undefined) {
		throw new InvalidChangeError(
			index,
			`changes[${table.deletedAt}] deletes table "${ref}", so no later change can use it.`,
		);
	}
	return table;
}

async function findExistingTable(view: BatchView, index: number, ref: string) {
	const reference = await resolveReference(view, index, ref);
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

async function resolveReference(
	view: BatchView,
	index: number,
	ref: string,
): Promise<{ id: string; name: string; projectId?: string }> {
	const cached = view.references.get(ref);
	if (cached) return cached;
	const reference = await lookUpReference(view, index, ref);
	if (reference) view.references.set(ref, reference);
	return reference ?? { id: ref, name: ref, projectId: view.projectId };
}

/** Without a resolver the service cannot look up the table, so the reference is used as is. */
async function lookUpReference(view: BatchView, index: number, ref: string) {
	try {
		return await view.context.dataTableService.resolveTableReference?.(ref, {
			projectId: view.projectId,
			permission: 'read',
		});
	} catch (error) {
		const detail = error instanceof Error ? ` (${error.message})` : '';
		throw new InvalidChangeError(
			index,
			`Table "${ref}" was not found${detail}. Run list_data_tables to find the table, or create it earlier in the batch.`,
		);
	}
}

// ── Columns ────────────────────────────────────────────────────────────────

/** Reads the columns of an existing table once, when a column change first needs them. */
async function loadColumns(view: BatchView, table: TableView) {
	if (table.columns) return table.columns;
	if (table.table.kind !== 'existing') return (table.columns = new Map());
	const schema = await view.context.dataTableService.getSchema(table.table.id, {
		projectId: table.table.projectId,
	});
	table.columns = new Map(schema.map(({ name, id }) => [name, id]));
	return table.columns;
}

/** Finds a column by name, or by ID for columns that already exist. */
async function findColumn(view: BatchView, table: TableView, index: number, ref: string) {
	const columns = await loadColumns(view, table);
	if (columns.has(ref)) return ref;
	const byId = [...columns].find(([, id]) => id === ref);
	if (byId) return byId[0];
	throw new InvalidChangeError(
		index,
		`Table "${table.table.name}" has no column "${ref}". Run get_data_table_schema to check its columns.`,
	);
}

async function assertColumnNameFree(
	view: BatchView,
	table: TableView,
	index: number,
	name: string,
) {
	const columns = await loadColumns(view, table);
	if (!columns.has(name)) return columns;
	throw new InvalidChangeError(
		index,
		`Table "${table.table.name}" already has a column "${name}". Pick another name.`,
	);
}

async function applyAddColumn(view: BatchView, table: TableView, index: number, name: string) {
	const columns = await assertColumnNameFree(view, table, index, name);
	columns.set(name, undefined);
	table.addedColumns.add(name);
}

async function applyDeleteColumn(view: BatchView, table: TableView, index: number, ref: string) {
	const name = await findColumn(view, table, index, ref);
	if (table.addedColumns.has(name)) {
		throw new InvalidChangeError(
			index,
			`An earlier change in this batch adds column "${name}". Remove both changes instead.`,
		);
	}
	table.columns?.delete(name);
}

async function applyRenameColumn(
	view: BatchView,
	table: TableView,
	index: number,
	change: Extract<DataTableChange, { action: 'rename-column' }>,
) {
	const name = await findColumn(view, table, index, change.column);
	const columns = await assertColumnNameFree(view, table, index, change.newName);
	columns.set(change.newName, columns.get(name));
	columns.delete(name);
	if (table.addedColumns.delete(name)) table.addedColumns.add(change.newName);
}
