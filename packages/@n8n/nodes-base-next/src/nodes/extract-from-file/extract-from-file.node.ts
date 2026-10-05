import { defineNode, t, type FileCell, type FileRow } from '@n8n/node-sdk';

/** Reads the content of a file of the input item. The host parses it, so the bytes stay in n8n. */
export const extractFromFile = defineNode({
	id: 'extractFromFile',
	displayName: 'Extract from File',
});

export const file = t
	.binary()
	.with({ title: 'Input Binary Field' })
	.hint('A binary of the input item, e.g. (item) => item.binary.data');

export const cell = t.nullable(t.union(t.str(), t.num(), t.bool()));

/** One output item per row: an object by column name, or `{ row }` without a header row. */
export const tableRow = t.union(
	t.record(cell).hint('One field per column, by the name in the header row'),
	t.obj({ row: t.arr(cell).hint('The cells of the row, for a file without a header row') }),
);

// `Array.isArray` does not narrow a readonly list.
const isCells = (row: FileRow): row is readonly FileCell[] => Array.isArray(row);

/** The output item of a row. */
export const itemOfRow = (row: FileRow) => (isCells(row) ? { row } : row);

export const header = t
	.bool()
	.with({ title: 'Header Row' })
	.default(true)
	.hint('true: the first row names the columns; false: each item is { row: [cells] }');

export const includeEmptyCells = t
	.bool()
	.with({ title: 'Include Empty Cells' })
	.default(false)
	.hint('Keep an empty cell as an empty string; else the item has no such field');

export const encoding = t
	.str()
	.with({ title: 'Encoding', minLength: 1 })
	.default('utf8')
	.hint('An iconv-lite encoding name, e.g. utf8, latin1, win1252');

export const stripBom = t
	.bool()
	.with({ title: 'Strip BOM' })
	.default(true)
	.hint('Remove a byte order mark at the start of the text');
