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
 *
 * A filter selects the rows that n8n selects on SQLite (`matchesFilter`), with the
 * conditions of n8n's data-table service (`eq`, `neq`, `like`, `ilike`, `gt`, `gte`,
 * `lt`, `lte`, `isEmpty`, `isNotEmpty`) and the true/false tests that the node sends.
 * n8n converts a value to its column type before the query, and SQLite compares the
 * value with the type of the column: a text column compares text, a number column a
 * number, and a date column n8n's date text. Rows come back in n8n's order, `id`
 * last, and `take: 0` is no limit.
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
import { tryToParseBoolean, tryToParseDateTime, tryToParseNumber } from 'n8n-workflow';

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

/**
 * A dry-run row as n8n reports it: the row before or after a change, and nulls for a
 * side that has no row (`toDryRunRows` of `data-table-rows.repository.ts`).
 */
function dryRunRow(
	row: StoredRow | null,
	state: 'before' | 'after',
	template: StoredRow,
): DataTableRowReturnWithState {
	const out: DataTableRowReturnWithState = {
		id: null,
		createdAt: null,
		updatedAt: null,
		dryRunState: state,
	};
	for (const key of Object.keys(toReturn(template))) out[key] = null;
	if (row !== null) Object.assign(out, toReturn(row), { dryRunState: state });
	return out;
}

/** The column types that n8n gives its system columns (`DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP`). */
const SYSTEM_COLUMN_TYPES: Record<string, DataTableColumnType> = {
	id: 'number',
	createdAt: 'date',
	updatedAt: 'date',
};

/** The type of each column of a table, the system columns included. */
function columnTypesOf(t: StoredTable): Map<string, DataTableColumnType> {
	const types = new Map<string, DataTableColumnType>(Object.entries(SYSTEM_COLUMN_TYPES));
	for (const c of t.columns) types.set(c.name, c.type);
	return types;
}

/** A value as SQLite compares it: a number, text, or NULL. */
type SqlValue = number | string | null;

/** One filter condition of the data-table node or service. */
type FilterEntry = DataTableFilter['filters'][number];

function pad(value: number, width: number): string {
	return String(value).padStart(width, '0');
}

/** A date or time without a zone, in the form that n8n stores (`2024-03-01 10:00:00.000`). */
const ZONELESS_DATE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d{1,6})?$/;

/**
 * An instant as n8n's database holds it: UTC, a space between date and time, and
 * milliseconds (`sql-utils.ts`, `formatDateForDatabase`). SQLite keeps that text, so a
 * date column compares text, not a time.
 */
function spaceFormOf(date: Date): string {
	const day = `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
	const time = `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}`;
	return `${day} ${time}.${pad(date.getUTCMilliseconds(), 3)}`;
}

/**
 * A date value as n8n's service turns it into text: UTC ISO text with milliseconds
 * (`validateAndTransformCell` calls `toUTC().toISO()`). Luxon reads a value without a
 * zone as the local time, so this is not the same as a stored date.
 */
function isoTextOf(value: unknown): string | undefined {
	return tryToParseDateTime(value).toUTC().toISO() ?? undefined;
}

/** A cell as UTC ISO text, where a value that is not a date keeps no date text. */
function cellIsoText(value: DataTableColumnJsType): string | undefined {
	try {
		return isoTextOf(value);
	} catch {
		return undefined;
	}
}

/**
 * A date cell as n8n's table holds it: n8n writes the instant as UTC text without a
 * zone, so a cell that is zone-less text names UTC, and a cell with a zone names its
 * own instant. A cell with a date but no time is an input, which n8n reads as local.
 */
function storedDateText(cell: DataTableColumnJsType): string | undefined {
	if (cell instanceof Date) {
		return Number.isNaN(cell.getTime()) ? undefined : spaceFormOf(cell);
	}
	if (typeof cell !== 'string') return undefined;
	const text = cell.trim();
	const date = ZONELESS_DATE.test(text) ? new Date(`${text.replace(' ', 'T')}Z`) : new Date(text);
	return Number.isNaN(date.getTime()) ? undefined : spaceFormOf(date);
}

/** A number as a TEXT column of SQLite holds it. */
function textOfNumber(value: number): string {
	return String(value);
}

/** A cell as text, which is what `like` and a TEXT column compare. */
function textOf(cell: DataTableColumnJsType): string {
	if (typeof cell === 'string') return cell;
	if (typeof cell === 'number') return textOfNumber(cell);
	if (typeof cell === 'boolean') return cell ? '1' : '0';
	return cellIsoText(cell) ?? String(cell);
}

/** A well-formed number, as SQLite reads text for a column with numeric affinity. */
const WELL_FORMED_NUMBER = /^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/;

function numberOfText(text: string): number | undefined {
	return WELL_FORMED_NUMBER.test(text) ? Number(text) : undefined;
}

/**
 * A stored cell as SQLite compares it, given the affinity of its column type:
 * `string` is TEXT, `number` is REAL, and `boolean` and `date` are NUMERIC.
 * The file can hold a number as text, a boolean as text, or a date in ISO form,
 * where n8n's own table holds a number, `1`/`0`, or `YYYY-MM-DD HH:MM:SS.mmm`.
 */
function storedValue(cell: DataTableColumnJsType | undefined, type: DataTableColumnType): SqlValue {
	if (cell === null || cell === undefined) return null;
	switch (type) {
		case 'number':
			if (typeof cell === 'number') return cell;
			if (typeof cell === 'boolean') return cell ? 1 : 0;
			if (typeof cell === 'string') return numberOfText(cell) ?? cell;
			return spaceFormOf(cell);
		case 'boolean':
			if (typeof cell === 'boolean') return cell ? 1 : 0;
			if (typeof cell === 'number') return cell;
			if (typeof cell !== 'string') return spaceFormOf(cell);
			if (cell.trim().toLowerCase() === 'true') return 1;
			if (cell.trim().toLowerCase() === 'false') return 0;
			return numberOfText(cell) ?? cell;
		case 'date':
			// n8n holds a date in its own text form, so the file row compares as stored.
			return storedDateText(cell) ?? textOf(cell);
		default:
			return textOf(cell);
	}
}

/**
 * A filter value as n8n's data-table service leaves it before the query, and as
 * SQLite then compares it: n8n converts the value to the column type
 * (`validateAndTransformFilters`), a date stays a `Date` that the driver binds as
 * n8n's date text, and a NUMBER that a TEXT column compares becomes text.
 */
function filterValue(value: DataTableColumnJsType, type: DataTableColumnType): SqlValue {
	if (value === null || value === undefined) return null;
	const raw = typeof value === 'boolean' ? (value ? 1 : 0) : value;
	switch (type) {
		case 'string':
			return typeof raw === 'number' ? textOfNumber(raw) : textOf(raw);
		case 'number':
		case 'boolean':
			if (typeof raw === 'number') return raw;
			if (typeof raw === 'string') return numberOfText(raw) ?? raw;
			return cellIsoText(raw) ?? String(raw);
		default:
			// A date value that n8n binds goes as the driver's date text; a text value keeps
			// the form that n8n's validation gave it.
			if (typeof raw === 'string') return numberOfText(raw) ?? raw;
			if (typeof raw === 'number') return raw;
			return spaceFormOf(raw);
	}
}

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * A filter value as n8n's data-table service validates and converts it for the column
 * type (`validateAndTransformCell`): a number column takes a number or a number as
 * text, a boolean column a boolean or `'1'`/`'true'`, and on a date column a `Date`
 * stays as it is while any other date value becomes UTC ISO text.
 */
function convertFilterValue(
	name: string,
	value: DataTableColumnJsType | undefined,
	type: DataTableColumnType,
): DataTableColumnJsType {
	if (value === null || value === undefined) return null;
	try {
		switch (type) {
			case 'number':
				return tryToParseNumber(value);
			case 'boolean':
				return tryToParseBoolean(value);
			case 'date':
				if (value instanceof Date) {
					if (Number.isNaN(value.getTime())) throw new Error('Value is not a valid date');
					return value;
				}
				return isoTextOf(value) ?? String(value);
			default:
				return value;
		}
	} catch (error) {
		throw new DataTableError(
			`value '${String(value)}' does not match column type '${type}' for column '${name}': ${messageOf(error)}`,
		);
	}
}

function escapeRegExp(ch: string): string {
	return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** SQLite folds the ASCII letters only, as `UPPER` does. */
function asciiUpper(text: string): string {
	return text.replace(/[a-z]/g, (ch) => ch.toUpperCase());
}

/**
 * A LIKE pattern as n8n runs it on SQLite. `like` is a GLOB in which only `%` is a
 * wildcard: `toSqliteGlobFromPercent` escapes `[`, `]`, `*` and `?`, and `_` stays
 * literal. `ilike` is `UPPER(col) LIKE UPPER(value) ESCAPE '\'`, where n8n escapes `\`
 * and `_` first (`escapeLikeSpecials`), so only `%` is a wildcard there too.
 */
function likeToRegExp(pattern: string, condition: 'like' | 'ilike'): RegExp {
	if (condition === 'like') {
		const glob = [...pattern].map((ch) => (ch === '%' ? '[\\s\\S]*' : escapeRegExp(ch)));
		return new RegExp(`^${glob.join('')}$`);
	}
	// `UPPER(col) LIKE UPPER(pattern) ESCAPE '\'`: a backslash escapes the character after it.
	const chars = asciiUpper(pattern.replace(/\\/g, '\\\\').replace(/_/g, '\\_'));
	const body: string[] = [];
	for (let i = 0; i < chars.length; i++) {
		const ch = chars[i];
		if (ch === '\\') {
			i++;
			body.push(escapeRegExp(chars[i] ?? ''));
		} else if (ch === '%') {
			body.push('[\\s\\S]*');
		} else if (ch === '_') {
			body.push('[\\s\\S]');
		} else {
			body.push(escapeRegExp(ch));
		}
	}
	return new RegExp(`^${body.join('')}$`);
}

/** A comparison with SQLite's order: NULL before any value, a number before text, text by its bytes. */
function compareSql(a: SqlValue, b: SqlValue): number {
	if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
	if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
	if (a === null || b === null) return 0;
	// SQLite sorts every number before every text value.
	return typeof a === 'number' ? -1 : 1;
}

/** `compareSql` with NULL first, as an ascending `ORDER BY` of SQLite has it. */
function compareNullable(a: SqlValue, b: SqlValue): number {
	if (a === null) return b === null ? 0 : -1;
	if (b === null) return 1;
	return compareSql(a, b);
}

/**
 * The value of a true or a false test of the data-table node, if the entry is one. n8n's
 * filter type does not name those two conditions.
 */
function truthOf(entry: FilterEntry): boolean | undefined {
	const condition: string = entry.condition;
	if (condition === 'isTrue') return true;
	if (condition === 'isFalse') return false;
	return undefined;
}

/** One condition as n8n's data-table service runs it on SQLite, as a test of a cell. */
function conditionTest(entry: FilterEntry, type: DataTableColumnType): (cell: SqlValue) => boolean {
	const name = entry.columnName;
	const truth = truthOf(entry);

	// The data-table node sends a true or a false test as `eq true` and `eq false`
	// (`buildGetManyFilter`), and n8n's API does not accept those two conditions.
	let condition: FilterEntry['condition'] = truth === undefined ? entry.condition : 'eq';
	let value: DataTableColumnJsType = truth ?? convertFilterValue(name, entry.value, type);

	// n8n maps empty/not-empty on a column that is not text to a null test, because only
	// text has an empty value. The data-table node does the same before the call.
	if (
		truth === undefined &&
		type !== 'string' &&
		(condition === 'isEmpty' || condition === 'isNotEmpty')
	) {
		condition = condition === 'isEmpty' ? 'eq' : 'neq';
		value = null;
	}

	if (condition === 'like' || condition === 'ilike') {
		const upper = condition.toUpperCase();
		if (value === null)
			throw new DataTableError(`${upper} filter value cannot be null or undefined`);
		if (typeof value !== 'string')
			throw new DataTableError(`${upper} filter value must be a string`);
		// As the service: a value without `%` is a contains search.
		const pattern = value.includes('%') ? value : `%${value}%`;
		const regex = likeToRegExp(pattern, condition);
		return (cell) => {
			if (typeof cell !== 'string') return false;
			return regex.test(condition === 'ilike' ? asciiUpper(cell) : cell);
		};
	}

	if (condition === 'gt' || condition === 'gte' || condition === 'lt' || condition === 'lte') {
		if (value === null) {
			throw new DataTableError(
				`${condition.toUpperCase()} filter value cannot be null or undefined`,
			);
		}
	}

	const other = filterValue(value, type);
	switch (condition) {
		case 'isEmpty':
			return (cell) => cell === null || cell === '';
		case 'isNotEmpty':
			return (cell) => cell !== null && cell !== '';
		case 'eq':
			return (cell) =>
				other === null ? cell === null : cell !== null && compareSql(cell, other) === 0;
		case 'neq':
			// n8n includes the NULL rows in `!=`, because SQL compares NULL as unknown.
			return (cell) =>
				other === null ? cell !== null : cell === null || compareSql(cell, other) !== 0;
		case 'gt':
			return (cell) => cell !== null && other !== null && compareSql(cell, other) > 0;
		case 'gte':
			return (cell) => cell !== null && other !== null && compareSql(cell, other) >= 0;
		case 'lt':
			return (cell) => cell !== null && other !== null && compareSql(cell, other) < 0;
		case 'lte':
			return (cell) => cell !== null && other !== null && compareSql(cell, other) <= 0;
		default:
			return () => false;
	}
}

/** The cell of a row for a column, the system columns included. */
function cellOf(row: StoredRow, name: string): DataTableColumnJsType | undefined {
	return name === 'id' ? row.id : row[name];
}

/** True when the row matches the filter, as n8n's data-table service selects on SQLite. */
export function matchesFilter(
	row: StoredRow,
	filter: DataTableFilter | undefined,
	types: Map<string, DataTableColumnType>,
): boolean {
	const list = filter?.filters ?? [];
	if (list.length === 0) return true;
	const tests = list.map((entry) => {
		const type = types.get(entry.columnName);
		if (type === undefined) throw new DataTableError(`unknown column name '${entry.columnName}'`);
		const test = conditionTest(entry, type);
		const cell = storedValue(cellOf(row, entry.columnName), type);
		return () => test(cell);
	});
	return filter?.type === 'or' ? tests.some((test) => test()) : tests.every((test) => test());
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
	/**
	 * The rows that a filter selects for update, upsert or delete, in `id` order: n8n's
	 * queries for those rows have no `ORDER BY`, so SQLite returns them in rowid order.
	 */
	const matching = (t: StoredTable, filter: DataTableFilter): StoredRow[] => {
		const types = columnTypesOf(t);
		return t.rows.filter((r) => matchesFilter(r, filter, types)).sort((a, b) => a.id - b.id);
	};
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
			const types = columnTypesOf(t);
			// n8n sorts on `id` last, also when the caller sorts on a column, so ties keep one order.
			const column = dto.sortBy?.[0] ?? 'id';
			const sign = dto.sortBy?.[1] === 'DESC' ? -1 : 1;
			const type = types.get(column) ?? 'string';
			const rows = t.rows
				.filter((r) => matchesFilter(r, dto.filter, types))
				.sort((a, b) => {
					const byValue = compareNullable(
						storedValue(cellOf(a, column), type),
						storedValue(cellOf(b, column), type),
					);
					return byValue === 0 ? a.id - b.id : sign * byValue;
				});
			const skip = dto.skip ?? 0;
			// n8n takes no limit for `take: 0`: `if (dto.take) query.take(dto.take)`.
			const page = dto.take ? rows.slice(skip, skip + dto.take) : rows.slice(skip);
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
			const hit = matching(t, filter);
			if (dryRun) {
				return hit.flatMap((r) => {
					const after: StoredRow = { ...r, updatedAt: new Date().toISOString() };
					assign(t, after, data);
					return [dryRunRow(r, 'before', r), dryRunRow(after, 'after', r)];
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
			const hit = matching(t, filter);
			if (hit.length === 0) {
				if (!dryRun) {
					const row = insertOne(t, data);
					writeTable(dir, t);
					return [toReturn(row)];
				}
				// A dry run inserts nothing, and reports the row that would come with the
				// placeholder id that n8n gives a row that does not exist yet.
				const now = new Date().toISOString();
				const row: StoredRow = { id: 0, createdAt: now, updatedAt: now };
				for (const c of t.columns) row[c.name] = null;
				assign(t, row, data);
				return [dryRunRow(null, 'before', row), dryRunRow(row, 'after', row)];
			}
			if (dryRun) {
				return hit.flatMap((r) => {
					const after: StoredRow = { ...r, updatedAt: new Date().toISOString() };
					assign(t, after, data);
					return [dryRunRow(r, 'before', r), dryRunRow(after, 'after', r)];
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
			const hit = matching(t, filter);
			if (dryRun) {
				const rows = hit.flatMap((r) => [dryRunRow(r, 'before', r), dryRunRow(null, 'after', r)]);
				// The proxy type promises plain rows. n8n's own v1 proxy returns the dry-run rows
				// of its service under that type (`data-table-proxy.service.ts`), so match it.
				return rows as DataTableRowReturn[];
			}
			t.rows = t.rows.filter((r) => !hit.includes(r));
			writeTable(dir, t);
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
