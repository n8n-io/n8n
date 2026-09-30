import { arr, bool, defineAction, int, matches, obj, oneOf, ref, str } from '@n8n/node-sdk';

import {
	cellText,
	googleSheets,
	googleSpreadsheet,
	readValues,
	ROW_NUMBER,
	sheetInput,
	sheetOf,
	sheetRow,
	spreadsheetIdOf,
} from './node';

type Row = readonly unknown[];

interface Filter {
	readonly column: string;
	readonly value: string;
}

const range = (length: number) => Array.from({ length }, (_, index) => index);
const longest = (rows: readonly Row[]) => rows.reduce((max, row) => Math.max(max, row.length), 0);
const filled = (cell: unknown) => Boolean(cell) || typeof cell === 'number';
const labelled = (rows: unknown[][]) =>
	rows.map((row, index) => (index === 0 ? [ROW_NUMBER, ...row.slice(1)] : row));

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
	if (!header || dataStart < keyRow) throw new Error('The key row does not exist');
	const keys = header.map((cell, column) => cell || `col_${column}`);
	const padded = rows.map((row) =>
		row.length >= keys.length ? row : [...row, ...range(keys.length - row.length).map(() => '')],
	);
	const tests = filters.map(({ column, value }) => {
		const index = keys.findIndex((key) => cellText(key) === column);
		if (index === -1) throw new Error(`The column "${column}" could not be found`);
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

const location = obj({
	headerRow: int().with({ minimum: 1 }).default(1),
	firstDataRow: int().with({ minimum: 1 }).default(2),
});

const input = {
	spreadsheet: ref(googleSpreadsheet),
	sheet: sheetInput,
	filters: arr(obj({ column: str().hint('Exact header text'), value: str() })).optional(),
	combine: oneOf('AND', 'OR').default('AND'),
	allMatches: bool().default(true).hint('false returns only the first match'),
	header: location.hint('Omit to detect the table; set to read fixed rows').optional(),
};

export const readSheetRows = defineAction({
	node: googleSheets,
	id: 'googleSheets.sheet.read',
	action: 'Get rows',
	summary: 'Read rows, optionally only those matching column filters.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
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
	async run({ input: parameters, http, emit }) {
		const spreadsheetId = spreadsheetIdOf(parameters.spreadsheet);
		const sheet = await sheetOf(http, spreadsheetId, parameters.sheet);
		const values = await readValues(http, spreadsheetId, sheet, 'UNFORMATTED_VALUE');
		if (values.length === 0) return;
		const { header } = parameters;
		const keyRow = header ? (header.headerRow ?? 1) - 1 : 0;
		const dataStart = header ? (header.firstDataRow ?? 2) - 1 : 1;
		const numbered = values.map((row, index) => [
			index === keyRow ? ROW_NUMBER : index + 1,
			...row,
		]);
		const rows = header ? numbered : detectRange(numbered);
		const filters = parameters.filters ?? [];
		const found = filters.length
			? lookup(
					rows,
					keyRow,
					dataStart,
					filters,
					parameters.combine ?? 'AND',
					parameters.allMatches ?? true,
				)
			: structure(rows, keyRow, dataStart);
		for (const row of found) {
			if (!matches(sheetRow, row)) throw new Error('Google Sheets returned a row without a number');
			emit(row);
		}
	},
});
