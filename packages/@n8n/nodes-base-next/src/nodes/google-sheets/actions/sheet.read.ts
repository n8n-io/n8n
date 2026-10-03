import { readAs, t, UserError } from '@n8n/node-sdk';

import { sheet, spreadsheetIdOf } from '../google-sheets.node';
import { cellText, readValues, ROW_NUMBER, sheetOf, sheetRow, USER_ROW_NUMBER } from '../table';

type Row = readonly unknown[];

interface Filter {
	readonly column: string;
	readonly value: string;
}

const range = (length: number) => Array.from({ length }, (_, index) => index);
const longest = (rows: readonly Row[]) => rows.reduce((max, row) => Math.max(max, row.length), 0);
const filled = (cell: unknown) => Boolean(cell) || typeof cell === 'number';
/** The first cell of the key row is the `row_number` key, so a header cell must not repeat it. */
const keyCells = (row: Row) => [
	ROW_NUMBER,
	...row.slice(1).map((cell) => (cell === ROW_NUMBER ? USER_ROW_NUMBER : cell)),
];
const labelled = (rows: unknown[][]) =>
	rows.map((row, index) => (index === 0 ? keyCells(row) : row));

/** Mirrors `removeEmptyColumns` in nodes-base GoogleSheets.utils.ts. */
function removeEmptyColumns(rows: readonly Row[]): unknown[][] {
	const kept = range(longest(rows)).filter(
		(column) => rows[0]?.[column] !== '' || rows.slice(1).some((row) => filled(row[column])),
	);
	if (kept.length === 0) return [];
	return rows.map((row) => kept.map((column) => (row[column] === undefined ? '' : row[column])));
}

/** Mirrors `prepareSheetData` with `detectAutomatically`: drop empty columns and rows. */
function detectRange(rows: unknown[][]): unknown[][] {
	const columns = removeEmptyColumns(rows);
	const first = columns.findIndex((row) => row.slice(1).some(filled));
	const kept = columns
		.slice(first)
		.filter((row) => row.slice(1).some((cell) => filled(cell) || typeof cell === 'boolean'));
	return kept.length ? labelled(kept) : [];
}

/** Mirrors `convertSheetDataArrayToObjectArray` in nodes-base GoogleSheet.ts. */
function toObjects(rows: readonly Row[], keys: Row, addEmpty: boolean) {
	return rows.flatMap((row) => {
		const entries = row.flatMap((cell, column) => {
			const key = keys[column];
			return key ? [[cellText(key), cell ?? ''] as const] : [];
		});
		return entries.length || addEmpty ? [Object.fromEntries(entries)] : [];
	});
}

/** Mirrors `structureArrayDataByColumn` in nodes-base GoogleSheet.ts. */
function structure(rows: readonly Row[], keyRow: number, dataStart: number) {
	const header = rows[keyRow];
	if (!header || dataStart < keyRow) return [];
	const keys = range(longest(rows)).map((column) => header[column] || `col_${column}`);
	return toObjects(rows.slice(dataStart), keys, false);
}

/** Mirrors `lookupValues` in nodes-base GoogleSheet.ts for node version 4.7. */
function lookup(
	rows: readonly Row[],
	keyRow: number,
	dataStart: number,
	filters: readonly Filter[],
	combine: 'AND' | 'OR',
	allMatches: boolean,
) {
	const header = rows[keyRow];
	if (!header || dataStart < keyRow) throw new UserError('The key row does not exist');
	const keys = header.map((cell, column) => cell || `col_${column}`);
	const padded = rows.map((row) =>
		row.length >= keys.length ? row : [...row, ...range(keys.length - row.length).map(() => '')],
	);
	const tests = filters.map(({ column, value }) => {
		const index = keys.findIndex((key) => cellText(key) === column);
		if (index === -1) throw new UserError(`The column "${column}" could not be found`);
		return (row: Row) => row[index] !== undefined && cellText(row[index]) === value;
	});
	const candidates = padded.slice(dataStart);
	const matched =
		combine === 'OR'
			? allMatches
				? tests.flatMap((test) => candidates.filter(test))
				: tests.flatMap((test) => candidates.filter(test).slice(0, 1)).slice(0, 1)
			: candidates
					.filter((row) => tests.every((test) => test(row)))
					.slice(0, allMatches ? undefined : 1);
	const [keyCells = [], ...data] = removeEmptyColumns([keys, ...new Set(matched)]);
	return toObjects(data, keyCells, true);
}

const location = t.obj({
	headerRow: t.int().with({ minimum: 1 }).default(1),
	firstDataRow: t.int().with({ minimum: 1 }).default(2),
});

const input = {
	filters: t.arr(t.obj({ column: t.str().hint('Exact header text'), value: t.str() })).optional(),
	combine: t.oneOf('AND', 'OR').default('AND'),
	allMatches: t.bool().default(true).hint('false returns only the first match'),
	header: location.hint('Omit to detect the table; set to read fixed rows').optional(),
};

export const readSheetRows = sheet.action('read', {
	// Minor 1: an ID of any length, and the ID after /d/ in a URL.
	minor: 1,
	action: 'Get rows',
	summary: 'Read rows, optionally only those matching column filters.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input,
	output: sheetRow,
	deriveOutput({ filters }) {
		const columns = [
			...new Set(
				(Array.isArray(filters) ? filters : [])
					.map((filter) => filter.column)
					.filter((column) => typeof column === 'string' && !column.startsWith('=')),
			),
		];
		return {
			...sheetRow.json,
			properties: {
				...sheetRow.json.properties,
				...Object.fromEntries(columns.map((column) => [column, {}])),
			},
			required: [...(sheetRow.json.required ?? []), ...columns],
		};
	},
	async *run({ input: parameters, http }) {
		const spreadsheetId = spreadsheetIdOf(parameters.spreadsheet);
		const tab = await sheetOf(http, spreadsheetId, parameters.sheet);
		const values = await readValues(http, spreadsheetId, tab, 'UNFORMATTED_VALUE');
		if (values.length === 0) return;
		const { header } = parameters;
		const keyRow = header ? header.headerRow - 1 : 0;
		const dataStart = header ? header.firstDataRow - 1 : 1;
		const numbered = values.map((row, index) =>
			index === keyRow ? keyCells([undefined, ...row]) : [index + 1, ...row],
		);
		const rows = header ? numbered : detectRange(numbered);
		const filters = parameters.filters ?? [];
		const found = filters.length
			? lookup(rows, keyRow, dataStart, filters, parameters.combine, parameters.allMatches)
			: structure(rows, keyRow, dataStart);
		for (const row of found) yield readAs(sheetRow, row).value;
	},
});
