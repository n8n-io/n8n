import {
	isRecord,
	path,
	t,
	UserError,
	type Http,
	type Infer,
	type JsonSchema,
	type ResourceField,
} from '@n8n/node-sdk';

import type { sheetInput } from './google-sheets.node';

export const ROW_NUMBER = 'row_number';

/** `row_number` is the sheet row of an item, so a user column with that name takes this key. */
export const USER_ROW_NUMBER = 'row_number_1';

/** The key of a header cell. */
export const columnKey = (cell: unknown) => {
	const text = cellText(cell);
	return text === ROW_NUMBER ? USER_ROW_NUMBER : text;
};

export const cellFormat = t
	.oneOf('USER_ENTERED', 'RAW')
	.default('USER_ENTERED')
	.title('Cell Format');

export const rowValues = t
	.json()
	.title('Values')
	.hint('Header text -> value; to add a column, select the tab by ID, not by name');

/**
 * The column keys of the header cells that the `googleSheets.sheetName` field lookup lists. The
 * lookup reads row 1, so another header row gives none.
 */
export const headerKeysOf = (fields: readonly ResourceField[], headerRow: unknown) =>
	(headerRow ?? 1) === 1 ? [...new Set(fields.map(({ name }) => columnKey(name)))] : [];

/** `values` with the header keys only. A write skips `row_number`, so a read item fits too. */
export const headerValuesOf = (keys: readonly string[]): JsonSchema => ({
	type: 'object',
	properties: Object.fromEntries([ROW_NUMBER, ...keys].map((key) => [key, {}])),
	additionalProperties: false,
});

/** A row as the read operation emits it. */
export const sheetRow = t.obj({ [ROW_NUMBER]: t.int().hint('Sheet row of this item') }).with({
	additionalProperties: true,
	'x-n8n-hint': 'Keys are the header cell texts, exactly as written',
});

/** The values a write operation sent, as the legacy node emits them in mapping mode. */
export const writtenRow = t.json().hint('The values sent, keyed by header text');

/** Write operations emit the keys of `values`, so those keys are known at build time. */
export function deriveWritten({ values }: { values: unknown }): JsonSchema {
	if (!isRecord(values)) return writtenRow.json;
	const keys = Object.keys(values);
	return {
		...writtenRow.json,
		properties: Object.fromEntries(keys.map((key) => [key, {}])),
		required: keys,
	};
}

export interface SheetTab {
	readonly id: number;
	readonly title: string;
}

/** A quoted A1 range, valid for every tab title. */
const a1 = (title: string, cells?: string) =>
	`'${title.replace(/'/g, "''")}'${cells ? `!${cells}` : ''}`;

/** 0 → A, 25 → Z, 26 → AA. */
export const columnLetter = (index: number): string =>
	(index < 26 ? '' : columnLetter(Math.floor(index / 26) - 1)) +
	String.fromCharCode(65 + (index % 26));

/** Cells are primitives, so this matches the legacy `toString()` comparison. */
export const cellText = (value: unknown) =>
	typeof value === 'string' ? value : (JSON.stringify(value) ?? '');

export const toCell = (value: unknown): string | number | boolean => {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	return JSON.stringify(value);
};

export async function sheetOf(
	http: Http,
	spreadsheetId: string,
	sheet: Infer<typeof sheetInput>,
): Promise<SheetTab> {
	const response = await http.request({
		path: path`/${spreadsheetId}`,
		query: { fields: 'sheets.properties' },
	});
	const sheets = isRecord(response) && Array.isArray(response.sheets) ? response.sheets : [];
	const gid = sheet.mode === 'id' ? Number(sheet.id.replace(/^gid=/, '')) : undefined;
	const found = sheets
		.map((entry: unknown) =>
			isRecord(entry) && isRecord(entry.properties) ? entry.properties : {},
		)
		.find((properties) =>
			sheet.mode === 'name' ? properties.title === sheet.name : properties.sheetId === gid,
		);
	if (typeof found?.title !== 'string' || typeof found.sheetId !== 'number') {
		const label = sheet.mode === 'name' ? `name ${sheet.name}` : `ID ${sheet.id}`;
		throw new UserError(`Sheet with ${label} not found`);
	}
	return { id: found.sheetId, title: found.title };
}

export async function readValues(
	http: Http,
	spreadsheetId: string,
	sheet: SheetTab,
	valueRenderOption: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE',
): Promise<unknown[][]> {
	const response = await http.request({
		path: path`/${spreadsheetId}/values/${a1(sheet.title)}`,
		query: { valueRenderOption, dateTimeRenderOption: 'FORMATTED_STRING' },
	});
	const rows = isRecord(response) && Array.isArray(response.values) ? response.values : [];
	return rows.map((row: unknown) => (Array.isArray(row) ? row.map((cell: unknown) => cell) : []));
}

export async function writeRow(
	http: Http,
	spreadsheetId: string,
	sheet: SheetTab,
	rowNumber: number,
	cells: ReadonlyArray<string | number | boolean>,
	valueInputOption: Infer<typeof cellFormat>,
) {
	const range = a1(sheet.title, `${rowNumber}:${rowNumber}`);
	await http.request({
		method: 'PUT',
		path: path`/${spreadsheetId}/values/${range}`,
		query: { valueInputOption },
		body: { range, values: [cells] },
	});
}

export async function updateCells(
	http: Http,
	spreadsheetId: string,
	sheet: SheetTab,
	cells: ReadonlyArray<{ column: number; row: number; value: string | number | boolean }>,
	valueInputOption: Infer<typeof cellFormat>,
) {
	await http.request({
		method: 'POST',
		path: path`/${spreadsheetId}/values:batchUpdate`,
		body: {
			data: cells.map(({ column, row, value }) => ({
				range: a1(sheet.title, `${columnLetter(column)}${row}`),
				values: [[value]],
			})),
			valueInputOption,
		},
	});
}

/**
 * Like the legacy `useAppend` option. Google appends after the table it finds from `lastRow`, so
 * two runs that start together do not write the same row.
 */
export async function appendRow(
	http: Http,
	spreadsheetId: string,
	sheet: SheetTab,
	lastRow: number,
	cells: ReadonlyArray<string | number | boolean>,
	valueInputOption: Infer<typeof cellFormat>,
) {
	const range = a1(sheet.title, `${lastRow}:${lastRow}`);
	await http.request({
		method: 'POST',
		path: path`/${spreadsheetId}/values/${range}:append`,
		query: { valueInputOption, insertDataOption: 'INSERT_ROWS' },
		body: { range, values: [cells] },
	});
}

const filled = (cell: unknown) => cell !== null && cellText(cell).trim() !== '';

/**
 * The column keys of the header row. Each key of `values` that the header lacks becomes a new
 * column, like the legacy auto-map default; an empty sheet gets all keys. An empty header row
 * above data fails: the keys would label data they do not describe.
 */
export async function headerOf(
	http: Http,
	spreadsheetId: string,
	sheet: SheetTab,
	rows: readonly unknown[][],
	headerRow: number,
	values: Record<string, unknown>,
): Promise<string[]> {
	const existing = rows[headerRow - 1] ?? [];
	if (rows.length > 0 && !existing.some(filled)) {
		throw new UserError(
			`Header row ${headerRow} is empty. Write the column names in it, or set headerRow`,
		);
	}
	const header = existing.map(columnKey);
	const added = Object.keys(values).filter((key) => key !== ROW_NUMBER && !header.includes(key));
	if (added.length === 0) return header;
	await writeRow(http, spreadsheetId, sheet, headerRow, [...existing.map(toCell), ...added], 'RAW');
	return [...header, ...added];
}

/** One cell per column. A repeated header name gets the value in its first column only. */
export const rowCells = (header: readonly string[], values: Record<string, unknown>) =>
	header.map((name, column) => (header.indexOf(name) === column ? toCell(values[name]) : ''));
