import {
	defineNode,
	t,
	type DataTableColumnType,
	type DataTableFilter,
	type DataTableValue,
	type DataTableValues,
	type Infer,
	type InputItem,
	type JsonSchema,
	type ResourceField,
} from '@n8n/node-sdk';

/** Rows of the n8n data tables of the workflow's project. The host gives the tables; no credential. */
export const dataTable = defineNode({ id: 'dataTable', displayName: 'Data table' });

const tableId = t.obj({ id: t.str().with({ minLength: 1 }).hint('Data table ID') });
const tableName = t.obj({ name: t.str().with({ minLength: 1 }).hint('Exact data table name') });

export const tableRef = t.union(tableId, tableName).hint('The table by ID or by name');

export const row = dataTable.resource('row', { input: { table: tableRef } });

export const table = dataTable.resource('table');

/** One cell value. A date is ISO 8601 text. */
export const cell = t.nullable(t.union(t.str(), t.num(), t.bool())).hint('A date is ISO 8601 text');

const column = t
	.str()
	.with({ minLength: 1 })
	.hint('Column name, or the system column id, createdAt or updatedAt');

const ordered = t.union(t.num(), t.str());

const condition = t.variant('op', {
	eq: { column, value: cell },
	neq: { column, value: cell },
	like: { column, value: t.str().hint('% matches any text') },
	ilike: { column, value: t.str().hint('% matches any text; case is ignored') },
	gt: { column, value: ordered },
	gte: { column, value: ordered },
	lt: { column, value: ordered },
	lte: { column, value: ordered },
	isEmpty: { column },
	isNotEmpty: { column },
});

/** Rows that match all or any of the conditions. */
export const where = t.obj({
	match: t.oneOf('all', 'any').hint('all = AND, any = OR'),
	conditions: t.arr(condition).with({ minItems: 1 }),
});

export const values = t.record(cell).hint('Cell values by column name');

export const toFilter = ({ match, conditions }: Infer<typeof where>): DataTableFilter => ({
	match,
	conditions: conditions.map((entry) =>
		'value' in entry
			? { column: entry.column, op: entry.op, value: entry.value }
			: { column: entry.column, op: entry.op },
	),
});

export const SYSTEM_COLUMNS: readonly string[] = ['id', 'createdAt', 'updatedAt'];

const isCell = (value: unknown): value is DataTableValue =>
	value === null || ['string', 'number', 'boolean'].includes(typeof value);

/**
 * The cells of an input item, for a write without `values`. The system columns stay out, so
 * the rows of one table can feed another.
 */
export function cellsOf(item: InputItem): DataTableValues {
	const entries = Object.entries(item.json).filter(([key]) => !SYSTEM_COLUMNS.includes(key));
	return Object.fromEntries(
		entries.map(([key, value]) => {
			if (value === undefined) return [key, null];
			if (isCell(value)) return [key, value];
			throw new Error(
				`The field "${key}" of the item is not text, a number, a boolean or null. Set values to pick the cells.`,
			);
		}),
	);
}

/** A stored row. Without the table columns, each other field is a cell. */
export const storedRow = t
	.obj({
		id: t.int(),
		createdAt: t.str().with({ format: 'date-time' }),
		updatedAt: t.str().with({ format: 'date-time' }),
	})
	.with({
		additionalProperties: { ...cell.json, 'x-n8n-hint': 'One field per column, by column name' },
	});

const CELL_TYPES: Record<DataTableColumnType, JsonSchema> = {
	['string']: { type: 'string' },
	['number']: { type: 'number' },
	['boolean']: { type: 'boolean' },
	date: { type: 'string', format: 'date-time' },
};

const isColumnType = (value: unknown): value is DataTableColumnType =>
	typeof value === 'string' && value in CELL_TYPES;

/**
 * Closes the row type on the columns of the table, so a misspelled column fails `tsc`. The
 * lookup lists each column with its type as the value. A cell can be empty: null.
 */
export function rowFromColumns(fields: readonly ResourceField[]): JsonSchema {
	const columns = fields.flatMap(({ name, value }) =>
		isColumnType(value) && !SYSTEM_COLUMNS.includes(name)
			? [[name, { anyOf: [CELL_TYPES[value], { type: 'null' }] }] as const]
			: [],
	);
	return {
		...storedRow.json,
		properties: { ...storedRow.json.properties, ...Object.fromEntries(columns) },
		required: [...(storedRow.json.required ?? []), ...columns.map(([name]) => name)],
		additionalProperties: false,
	};
}

export const ROW_COLUMNS = 'dataTable.columns';

export const direction = t.oneOf('asc', 'desc');

export const sort = t.obj({ column, direction });

export const limit = t.int().with({ minimum: 1 }).hint('Omit for every match');

/** The rows or tables of one read come in pages of this size. */
const PAGE_SIZE = 1000;

/**
 * Pages until the limit, the count, or an empty page: entries can change between pages. The
 * node reads rows and tables with it. An SDK `paging` helper could replace it.
 */
export async function* pagesOf<T>(
	read: (offset: number, room: number) => Promise<{ count: number; entries: readonly T[] }>,
	most: number | undefined,
): AsyncGenerator<T> {
	// One loop, not one nested generator per page, so each entry passes one `yield*`.
	const at = { offset: 0, done: false };
	while (!at.done) {
		const room = most === undefined ? PAGE_SIZE : Math.min(PAGE_SIZE, most - at.offset);
		const { count, entries } = await read(at.offset, room);
		yield* entries;
		at.offset += entries.length;
		at.done =
			entries.length === 0 || at.offset >= count || (most !== undefined && at.offset >= most);
	}
}

const columnType = t.oneOf('string', 'number', 'boolean', 'date');

export const columns = t.arr(t.obj({ name: t.str().with({ minLength: 1 }), type: columnType }));

/** A table without its rows. */
export const tableInfo = t.obj({
	id: t.str(),
	name: t.str(),
	columns,
	createdAt: t.str().with({ format: 'date-time' }),
	updatedAt: t.str().with({ format: 'date-time' }),
});
