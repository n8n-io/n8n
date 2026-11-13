/**
 * Data tables for the Data Table node in the fallback host: n8n-core asks
 * `additionalData['data-table'].dataTableProxyProvider` for a service of one
 * table (`IDataTableProjectService`). The host answers in one of two ways:
 *
 * - A step on a runtime connection of protocol version 2 has a service channel
 *   (`ServiceDataTableProvider`). Every call is a `dataTable` service call to
 *   n8n (spec 9.9), so the step changes n8n's own data tables, as a native
 *   Data Table node does.
 * - A step without a channel uses the file store (`fileDataTableProvider`) when
 *   `WF_FALLBACK_DATA_TABLES_DIR` is set, for the test bed. The host keeps each
 *   table in `<WF_FALLBACK_DATA_TABLES_DIR>/<table id>.json`:
 *
 *       { "id"?, "name", "columns": [name | { name, type }], "rows": [ {...} ] }
 *
 * Rows get the system columns `id`, `createdAt` and `updatedAt` on first use.
 * Each call reads and writes the file, so a table outlives one step, as in n8n.
 * The filter conditions follow n8n's data-table service (`eq`, `neq`, `like`,
 * `ilike`, `gt`, `gte`, `lt`, `lte`, `isEmpty`, `isNotEmpty`).
 *
 * PoC limits: no locking across host workers in the file store, and the files
 * are not n8n's tables: the n8n UI does not show them.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
	DataTable,
	DataTableColumn,
	DataTableColumnJsType,
	DataTableColumnType,
	DataTableFilter,
	DataTableInsertRowsResult,
	DataTableInsertRowsReturnType,
	DataTableRow,
	DataTableRowReturn,
	DataTableRowReturnWithState,
	DataTableRows,
	DataTableProxyProvider,
	IDataTableProjectAggregateService,
	IDataTableProjectService,
	INode,
	ListDataTableRowsOptions,
	Workflow,
} from 'n8n-workflow';

import type { JsonObject, JsonValue } from './protocol';
import { isJsonObject } from './protocol';
import { callService } from './service-calls';

interface StoredRow {
	id: number;
	createdAt: string;
	updatedAt: string;
	[column: string]: DataTableColumnJsType;
}

interface StoredTable {
	id: string;
	name: string;
	columns: Array<{ name: string; type: DataTableColumnType }>;
	rows: StoredRow[];
	nextId: number;
}

export class DataTableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DataTableError';
	}
}

const SYSTEM = new Set(['id', 'createdAt', 'updatedAt']);

function columnType(value: unknown): DataTableColumnType {
	return value === 'number' || value === 'boolean' || value === 'date' ? value : 'string';
}

function cellValue(value: unknown): DataTableColumnJsType {
	if (value === null || value === undefined) return null;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	if (value instanceof Date) return value.toISOString();
	return JSON.stringify(value);
}

function readTable(dir: string, id: string): StoredTable {
	const file = join(dir, `${id}.json`);
	if (!existsSync(file)) throw new DataTableError(`Data table with id "${id}" not found`);
	const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
	if (!isJsonObject(raw)) throw new DataTableError(`Data table file ${file} is not an object`);
	const columns = (Array.isArray(raw.columns) ? raw.columns : []).map((c) =>
		isJsonObject(c)
			? {
					name: typeof c.name === 'string' ? c.name : JSON.stringify(c.name),
					type: columnType(c.type),
				}
			: { name: typeof c === 'string' ? c : JSON.stringify(c), type: columnType(undefined) },
	);
	const now = new Date().toISOString();
	let nextId = typeof raw.nextId === 'number' ? raw.nextId : 1;
	const rows: StoredRow[] = (Array.isArray(raw.rows) ? raw.rows : [])
		.filter(isJsonObject)
		.map((r) => {
			const row: StoredRow = {
				id: typeof r.id === 'number' ? r.id : nextId++,
				createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
				updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
			};
			for (const c of columns) row[c.name] = cellValue(r[c.name]);
			return row;
		});
	nextId = Math.max(nextId, ...rows.map((r) => r.id + 1), 1);
	return {
		id: typeof raw.id === 'string' ? raw.id : id,
		name: typeof raw.name === 'string' ? raw.name : id,
		columns,
		rows,
		nextId,
	};
}

function writeTable(dir: string, table: StoredTable): void {
	writeFileSync(join(dir, `${table.id}.json`), JSON.stringify(table));
}

function toReturn(row: StoredRow): DataTableRowReturn {
	const out: DataTableRowReturn = {
		id: row.id,
		createdAt: new Date(row.createdAt),
		updatedAt: new Date(row.updatedAt),
	};
	for (const [k, v] of Object.entries(row)) if (!SYSTEM.has(k)) out[k] = v;
	return out;
}

function likeToRegExp(pattern: string, flags: string): RegExp {
	const body = pattern
		.split('')
		.map((ch) => (ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
		.join('');
	return new RegExp(`^${body}$`, flags);
}

function comparable(v: DataTableColumnJsType | undefined): string | number {
	if (v instanceof Date) return v.getTime();
	if (typeof v === 'number') return v;
	if (typeof v === 'boolean') return v ? 1 : 0;
	if (typeof v === 'string') {
		const t = Date.parse(v);
		return /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(t) ? t : v;
	}
	return '';
}

/** True when the row matches the filter, as n8n's data-table service selects. */
export function matchesFilter(row: StoredRow, filter: DataTableFilter | undefined): boolean {
	const list = filter?.filters ?? [];
	if (list.length === 0) return true;
	const test = (f: DataTableFilter['filters'][number]): boolean => {
		const cell = f.columnName === 'id' ? row.id : row[f.columnName];
		const value = f.value instanceof Date ? f.value.toISOString() : f.value;
		switch (f.condition) {
			case 'eq':
				return value === null
					? cell === null || cell === undefined
					: String(cell) === String(value);
			case 'neq':
				return value === null
					? cell !== null && cell !== undefined
					: String(cell) !== String(value);
			case 'like':
				return typeof cell === 'string' && likeToRegExp(String(value), '').test(cell);
			case 'ilike':
				return typeof cell === 'string' && likeToRegExp(String(value), 'i').test(cell);
			case 'gt':
				return cell !== null && comparable(cell) > comparable(value);
			case 'gte':
				return cell !== null && comparable(cell) >= comparable(value);
			case 'lt':
				return cell !== null && comparable(cell) < comparable(value);
			case 'lte':
				return cell !== null && comparable(cell) <= comparable(value);
			case 'isEmpty':
				return cell === null || cell === undefined || cell === '';
			case 'isNotEmpty':
				return cell !== null && cell !== undefined && cell !== '';
			default:
				return false;
		}
	};
	return filter?.type === 'or' ? list.some(test) : list.every(test);
}

/** As n8n's data-table service: a filter or sort on a column that the table does not have fails. */
function checkColumns(t: StoredTable, names: Array<string | undefined>): void {
	for (const name of names) {
		if (name === undefined || SYSTEM.has(name)) continue;
		if (!t.columns.some((c) => c.name === name)) {
			throw new DataTableError(`unknown column name '${name}'`);
		}
	}
}

function tableService(dir: string, id: string): IDataTableProjectService {
	const load = () => readTable(dir, id);
	const columnsOf = (t: StoredTable): DataTableColumn[] =>
		t.columns.map((c, index) => ({
			id: c.name,
			name: c.name,
			type: c.type,
			index,
			dataTableId: t.id,
		}));
	const assign = (t: StoredTable, row: StoredRow, data: DataTableRow) => {
		for (const [k, v] of Object.entries(data)) {
			if (SYSTEM.has(k)) continue;
			if (!t.columns.some((c) => c.name === k)) {
				throw new DataTableError(`unknown column name '${k}'`);
			}
			row[k] = cellValue(v);
		}
	};
	const insertOne = (t: StoredTable, data: DataTableRow): StoredRow => {
		const now = new Date().toISOString();
		const row: StoredRow = { id: t.nextId++, createdAt: now, updatedAt: now };
		for (const c of t.columns) row[c.name] = null;
		assign(t, row, data);
		t.rows.push(row);
		return row;
	};
	return {
		async updateDataTable({ name }) {
			const t = load();
			t.name = name;
			writeTable(dir, t);
			return true;
		},
		async deleteDataTable() {
			throw new DataTableError('The fallback host cannot delete data tables');
		},
		async getColumns() {
			return columnsOf(load());
		},
		async addColumn({ name, type }) {
			const t = load();
			t.columns.push({ name, type });
			for (const r of t.rows) r[name] = null;
			writeTable(dir, t);
			return columnsOf(t)[t.columns.length - 1];
		},
		async moveColumn() {
			return true;
		},
		async deleteColumn(columnId) {
			const t = load();
			t.columns = t.columns.filter((c) => c.name !== columnId);
			writeTable(dir, t);
			return true;
		},
		async getManyRowsAndCount(dto: Partial<ListDataTableRowsOptions>) {
			const t = load();
			checkColumns(t, [...(dto.filter?.filters ?? []).map((f) => f.columnName), dto.sortBy?.[0]]);
			let rows = t.rows.filter((r) => matchesFilter(r, dto.filter));
			if (dto.sortBy) {
				const [column, direction] = dto.sortBy;
				const sign = direction === 'DESC' ? -1 : 1;
				rows = [...rows].sort((a, b) => {
					const x = comparable(a[column]);
					const y = comparable(b[column]);
					return x < y ? -sign : x > y ? sign : 0;
				});
			}
			const skip = dto.skip ?? 0;
			const page = dto.take === undefined ? rows.slice(skip) : rows.slice(skip, skip + dto.take);
			return { count: rows.length, data: page.map(toReturn) };
		},
		async insertRows<T extends DataTableInsertRowsReturnType>(rows: DataTableRow[], returnType: T) {
			const t = load();
			const added = rows.map((r) => insertOne(t, r));
			writeTable(dir, t);
			if (returnType === 'count') return { success: true, insertedRows: added.length } as never;
			if (returnType === 'id') return added.map((r) => ({ id: r.id })) as never;
			return added.map(toReturn) as never;
		},
		async updateRows({ filter, data, dryRun }) {
			const t = load();
			checkColumns(
				t,
				filter.filters.map((f) => f.columnName),
			);
			const hit = t.rows.filter((r) => matchesFilter(r, filter));
			if (dryRun) {
				return hit.flatMap((r) => {
					const after: StoredRow = { ...r };
					assign(t, after, data);
					return [
						{ ...toReturn(r), dryRunState: 'before' as const },
						{ ...toReturn(after), dryRunState: 'after' as const },
					];
				});
			}
			const now = new Date().toISOString();
			for (const r of hit) {
				assign(t, r, data);
				r.updatedAt = now;
			}
			writeTable(dir, t);
			return hit.map(toReturn);
		},
		async upsertRow({ filter, data, dryRun }) {
			const t = load();
			checkColumns(
				t,
				filter.filters.map((f) => f.columnName),
			);
			const hit = t.rows.filter((r) => matchesFilter(r, filter));
			if (hit.length === 0) {
				const row = insertOne(t, data);
				if (!dryRun) writeTable(dir, t);
				return dryRun ? [{ ...toReturn(row), dryRunState: 'after' as const }] : [toReturn(row)];
			}
			if (dryRun) {
				return hit.flatMap((r) => {
					const after: StoredRow = { ...r };
					assign(t, after, data);
					return [
						{ ...toReturn(r), dryRunState: 'before' as const },
						{ ...toReturn(after), dryRunState: 'after' as const },
					];
				});
			}
			const now = new Date().toISOString();
			for (const r of hit) {
				assign(t, r, data);
				r.updatedAt = now;
			}
			writeTable(dir, t);
			return hit.map(toReturn);
		},
		async deleteRows({ filter, dryRun }) {
			const t = load();
			checkColumns(
				t,
				filter.filters.map((f) => f.columnName),
			);
			const hit = t.rows.filter((r) => matchesFilter(r, filter));
			if (!dryRun) {
				t.rows = t.rows.filter((r) => !hit.includes(r));
				writeTable(dir, t);
			}
			return hit.map(toReturn);
		},
		async clearRows() {
			const t = load();
			const deletedCount = t.rows.length;
			t.rows = [];
			writeTable(dir, t);
			return { deletedCount };
		},
	};
}

function aggregateService(dir: string): IDataTableProjectAggregateService {
	const all = (): StoredTable[] =>
		readdirSync(dir)
			.filter((f) => f.endsWith('.json'))
			.map((f) => readTable(dir, f.slice(0, -'.json'.length)));
	const asTable = (t: StoredTable): DataTable & { project: Record<string, unknown> } => ({
		id: t.id,
		name: t.name,
		columns: t.columns.map((c, index) => ({
			id: c.name,
			name: c.name,
			type: c.type,
			index,
			dataTableId: t.id,
		})),
		createdAt: new Date(0),
		updatedAt: new Date(0),
		projectId: 'fallback-host',
		// n8n's queries join the project (`id`, `name`, `type`, `icon`), also for a new table.
		project: { id: 'fallback-host', name: 'fallback-host', type: 'team', icon: null },
	});
	return {
		getProjectId: () => 'fallback-host',
		async createDataTable({ name, columns }) {
			const id = `dt-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
			const t: StoredTable = {
				id,
				name,
				columns: columns.map((c) => ({ name: c.name, type: c.type })),
				rows: [],
				nextId: 1,
			};
			writeTable(dir, t);
			return asTable(t);
		},
		async getManyAndCount(options) {
			const filter = options.filter ?? {};
			const names =
				filter.name === undefined ? undefined : [filter.name].flat().map((n) => n.toLowerCase());
			const ids = filter.id === undefined ? undefined : [filter.id].flat();
			const data = all()
				.filter((t) => !names || names.some((n) => t.name.toLowerCase().includes(n)))
				.filter((t) => !ids || ids.includes(t.id))
				.map(asTable);
			const skip = options.skip ?? 0;
			const page =
				options.take === undefined ? data.slice(skip) : data.slice(skip, skip + options.take);
			return { count: data.length, data: page };
		},
		async deleteDataTableAll() {
			throw new DataTableError('The fallback host cannot delete data tables');
		},
	};
}

/** The provider for `additionalData['data-table']`, or undefined without a table folder. */
export function fileDataTableProvider(
	dir = process.env.WF_FALLBACK_DATA_TABLES_DIR,
): DataTableProxyProvider | undefined {
	if (!dir) return undefined;
	return {
		getDataTableAggregateProxy: async () => aggregateService(dir),
		getDataTableProxy: async (_workflow, _node, dataTableId) => tableService(dir, dataTableId),
	};
}

// ---------------------------------------------------------------------------
// n8n's data tables (service calls)

/**
 * A cell as the wire carries it. A `Date` becomes its ISO text, which n8n gives
 * back as a `Date` on a date column.
 */
type WireCell = string | number | boolean | null;

type WireFilter = {
	type: DataTableFilter['type'];
	filters: Array<{
		columnName: string;
		condition: DataTableFilter['filters'][number]['condition'];
		value: WireCell;
	}>;
};

function wireValue(value: DataTableColumnJsType): WireCell {
	return value instanceof Date ? value.toISOString() : value;
}

function wireRow(row: DataTableRow): Record<string, WireCell> {
	const out: Record<string, WireCell> = {};
	for (const [name, value] of Object.entries(row)) out[name] = wireValue(value);
	return out;
}

function wireFilter(filter: DataTableFilter): WireFilter {
	return {
		type: filter.type,
		filters: filter.filters.map((entry) => ({ ...entry, value: wireValue(entry.value) })),
	};
}

function unknownShape(what: string): DataTableError {
	return new DataTableError(`The data table service answered ${what} in an unknown shape`);
}

function toObject(value: JsonValue, what: string): JsonObject {
	if (!isJsonObject(value)) throw unknownShape(what);
	return value;
}

function toArray(value: JsonValue, what: string): JsonValue[] {
	if (!Array.isArray(value)) throw unknownShape(what);
	return value;
}

function toText(value: JsonValue, what: string): string {
	if (typeof value !== 'string') throw unknownShape(what);
	return value;
}

function toNumber(value: JsonValue, what: string): number {
	if (typeof value !== 'number') throw unknownShape(what);
	return value;
}

function toFlag(value: JsonValue, what: string): boolean {
	if (typeof value !== 'boolean') throw unknownShape(what);
	return value;
}

/** A timestamp as n8n's proxy types promise it: a `Date`. */
function toDate(value: JsonValue, what: string): Date {
	const date = new Date(toText(value, what));
	if (Number.isNaN(date.getTime())) throw unknownShape(what);
	return date;
}

/** A value that a table cell can hold. A JSON array or object is not one. */
function toCell(value: JsonValue, what: string): DataTableColumnJsType {
	if (value === null || typeof value === 'string' || typeof value === 'number') return value;
	if (typeof value === 'boolean') return value;
	throw unknownShape(what);
}

function toColumn(value: JsonValue, tableId: string): DataTableColumn {
	const column = toObject(value, 'a column');
	const type = column.type;
	if (type !== 'string' && type !== 'number' && type !== 'boolean' && type !== 'date') {
		throw unknownShape('a column type');
	}
	return {
		id: toText(column.id, 'a column id'),
		name: toText(column.name, 'a column name'),
		type,
		index: toNumber(column.index, 'a column index'),
		// The table list query of n8n does not select the column's table id.
		dataTableId:
			column.dataTableId === undefined
				? tableId
				: toText(column.dataTableId, 'a column dataTableId'),
	};
}

function toTable(value: JsonValue): DataTable {
	const table = toObject(value, 'a table');
	const id = toText(table.id, 'a table id');
	return {
		id,
		name: toText(table.name, 'a table name'),
		columns: toArray(table.columns, 'table columns').map((column) => toColumn(column, id)),
		createdAt: toDate(table.createdAt, 'a table createdAt'),
		updatedAt: toDate(table.updatedAt, 'a table updatedAt'),
		projectId: toText(table.projectId, 'a table projectId'),
	};
}

/** The column cells of a row. The system columns and the dry run state have their own fields. */
function rowCells(row: JsonObject): Record<string, DataTableColumnJsType> {
	const cells: Record<string, DataTableColumnJsType> = {};
	for (const [name, value] of Object.entries(row)) {
		if (name === 'id' || name === 'createdAt' || name === 'updatedAt') continue;
		if (name === 'dryRunState') continue;
		cells[name] = toCell(value, `a row column "${name}"`);
	}
	return cells;
}

function toRow(value: JsonValue): DataTableRowReturn {
	const row = toObject(value, 'a row');
	return {
		id: toNumber(row.id, 'a row id'),
		createdAt: toDate(row.createdAt, 'a row createdAt'),
		updatedAt: toDate(row.updatedAt, 'a row updatedAt'),
		...rowCells(row),
	};
}

/** A row of a dry run: it has no id yet when the row does not exist, and it carries its state. */
function toStateRow(value: JsonValue): DataTableRowReturnWithState {
	const row = toObject(value, 'a row');
	const state = row.dryRunState;
	if (state !== 'before' && state !== 'after') throw unknownShape('a dry run state');
	return {
		id: row.id === null ? null : toNumber(row.id, 'a row id'),
		createdAt: row.createdAt === null ? null : toDate(row.createdAt, 'a row createdAt'),
		updatedAt: row.updatedAt === null ? null : toDate(row.updatedAt, 'a row updatedAt'),
		...rowCells(row),
		dryRunState: state,
	};
}

function toRows(value: JsonValue): DataTableRowReturn[] {
	return toArray(value, 'rows').map(toRow);
}

/** The rows of update, upsert and delete. A dry run answers the state of each row. */
function toAffectedRows(value: JsonValue): DataTableRowReturn[] | DataTableRowReturnWithState[] {
	const rows = toArray(value, 'rows');
	return rows.some((row) => isJsonObject(row) && 'dryRunState' in row)
		? rows.map(toStateRow)
		: rows.map(toRow);
}

function toTablePage(value: JsonValue): { count: number; data: DataTable[] } {
	const page = toObject(value, 'a page of tables');
	return {
		count: toNumber(page.count, 'a table count'),
		data: toArray(page.data, 'a list of tables').map(toTable),
	};
}

function toRowPage(value: JsonValue): { count: number; data: DataTableRowReturn[] } {
	const page = toObject(value, 'a page of rows');
	return {
		count: toNumber(page.count, 'a row count'),
		data: toArray(page.data, 'a list of rows').map(toRow),
	};
}

/**
 * The provider for `additionalData['data-table']` of a step that has a service
 * channel: each call is a `dataTable` call of the step (spec 9.9), which n8n
 * runs with its engine v2 data-table service. The args of a call are the body
 * of n8n's contract (`engine-data-tables.contract.ts`), so a date goes as its
 * ISO text: n8n gives a date filter value its `Date` back.
 */
export class ServiceDataTableProvider implements DataTableProxyProvider {
	async getDataTableAggregateProxy(
		_workflow: Workflow,
		_node: INode,
		_projectId?: string,
	): Promise<IDataTableProjectAggregateService> {
		// n8n resolves the project of the workflow; `getProjectId` is synchronous.
		const projectId = toText(await callService('dataTable', 'getProjectId', {}), 'a project id');
		return {
			getProjectId: () => projectId,
			createDataTable: async (options) =>
				toTable(await callService('dataTable', 'createDataTable', { options })),
			getManyAndCount: async (options) => {
				// n8n pins the project of the execution, and its contract refuses a
				// project filter, so only the filters that the node uses go on the wire.
				const filter = options.filter;
				return toTablePage(
					await callService('dataTable', 'getManyAndCount', {
						options: {
							...(filter ? { filter: { id: filter.id, name: filter.name } } : {}),
							...(options.sortBy === undefined ? {} : { sortBy: options.sortBy }),
							...(options.take === undefined ? {} : { take: options.take }),
							...(options.skip === undefined ? {} : { skip: options.skip }),
						},
					}),
				);
			},
			deleteDataTableAll: async () => {
				throw new DataTableError('The fallback host cannot delete every data table of a project');
			},
		};
	}

	async getDataTableProxy(
		_workflow: Workflow,
		_node: INode,
		dataTableId: string,
		_projectId?: string,
	): Promise<IDataTableProjectService> {
		// A missing option (`dryRun`) stays out of the call: the contract makes it optional.
		const call = async (op: string, args: Record<string, unknown>) =>
			await callService('dataTable', op, { dataTableId, ...args });
		return {
			updateDataTable: async (options) =>
				toFlag(await call('updateDataTable', { options }), 'a table update'),
			deleteDataTable: async () => toFlag(await call('deleteDataTable', {}), 'a table delete'),
			getColumns: async () =>
				toArray(await call('getColumns', {}), 'columns').map((column) =>
					toColumn(column, dataTableId),
				),
			addColumn: async (options) => toColumn(await call('addColumn', { options }), dataTableId),
			moveColumn: async (columnId, options) =>
				toFlag(await call('moveColumn', { columnId, options }), 'a column move'),
			deleteColumn: async (columnId) =>
				toFlag(await call('deleteColumn', { columnId }), 'a column delete'),
			getManyRowsAndCount: async (options: Partial<ListDataTableRowsOptions>) =>
				toRowPage(
					await call('getManyRowsAndCount', {
						options: {
							...(options.filter === undefined ? {} : { filter: wireFilter(options.filter) }),
							...(options.sortBy === undefined ? {} : { sortBy: options.sortBy }),
							...(options.take === undefined ? {} : { take: options.take }),
							...(options.skip === undefined ? {} : { skip: options.skip }),
						},
					}),
				),
			insertRows: async <T extends DataTableInsertRowsReturnType>(
				rows: DataTableRows,
				returnType: T,
			) => {
				const answer = await call('insertRows', { rows: rows.map(wireRow), returnType });
				// The answer follows `returnType`, as n8n's contract says. Only the caller knows T.
				return (returnType === 'all' ? toRows(answer) : answer) as DataTableInsertRowsResult<T>;
			},
			updateRows: async (options) =>
				toAffectedRows(
					await call('updateRows', {
						options: {
							filter: wireFilter(options.filter),
							data: wireRow(options.data),
							dryRun: options.dryRun,
						},
					}),
				),
			upsertRow: async (options) =>
				toAffectedRows(
					await call('upsertRow', {
						options: {
							filter: wireFilter(options.filter),
							data: wireRow(options.data),
							dryRun: options.dryRun,
						},
					}),
				),
			deleteRows: async (options) => {
				const rows = await call('deleteRows', {
					options: { filter: wireFilter(options.filter), dryRun: options.dryRun },
				});
				// A dry run answers rows with a state. The proxy type says plain rows, and
				// n8n's own v1 proxy returns the same rows under that type, so match it.
				return toAffectedRows(rows) as DataTableRowReturn[];
			},
			clearRows: async () => {
				const answer = toObject(await call('clearRows', {}), 'a row count');
				return { deletedCount: toNumber(answer.deletedCount, 'a deleted row count') };
			},
		};
	}
}
