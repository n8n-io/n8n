import {
	defineNode,
	defineResource,
	int,
	json,
	obj,
	oneOf,
	str,
	variant,
	type Http,
	type Infer,
	type JsonSchema,
} from '@n8n/node-sdk';

export const googleSheets = defineNode({
	id: 'googleSheets',
	displayName: 'Google Sheets',
	credentials: ['googleSheetsOAuth2Api'],
	baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
});

export const ROW_NUMBER = 'row_number';

const SPREADSHEET_ID = '[-_a-zA-Z0-9]{25,}';

export const googleSpreadsheet = defineResource({
	id: 'googleSheets.spreadsheet',
	label: 'Spreadsheet',
	shape: { pattern: SPREADSHEET_ID, 'x-n8n-hint': 'Spreadsheet ID or Google Sheets URL' },
});

/** Mirrors `getSpreadsheetId` in nodes-base: a URL holds the ID as its first long token. */
export const spreadsheetIdOf = (value: string) =>
	new RegExp(SPREADSHEET_ID).exec(value)?.[0] ?? value;

export const sheetInput = variant('mode', {
	name: { name: str().hint('Exact tab name the user gave') },
	id: { id: str().with({ pattern: '^(gid=)?[0-9]+$' }).hint('A numeric sheet gid') },
}).hint('Never assume "Sheet1"; ask when the tab name is unknown');

export const cellFormat = oneOf('USER_ENTERED', 'RAW').default('USER_ENTERED');

export const rowValues = json().hint('Header text -> value; keys must equal header cells');

/** A row as the read operation emits it. */
export const sheetRow = obj({ [ROW_NUMBER]: int().hint('Sheet row of this item') }).with({
	additionalProperties: true,
	'x-n8n-hint': 'Keys are the header cell texts, exactly as written',
});

/** The values a write operation sent, as the legacy node emits them in mapping mode. */
export const writtenRow = json().hint('The values sent, keyed by header text');

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

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

const valuesPath = (spreadsheetId: string, range: string) =>
	`/${spreadsheetId}/values/${encodeURIComponent(range)}`;

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
		path: `/${spreadsheetId}`,
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
		throw new Error(`Sheet with ${label} not found`);
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
		path: valuesPath(spreadsheetId, a1(sheet.title)),
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
		path: valuesPath(spreadsheetId, range),
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
		path: `/${spreadsheetId}/values:batchUpdate`,
		body: {
			data: cells.map(({ column, row, value }) => ({
				range: a1(sheet.title, `${columnLetter(column)}${row}`),
				values: [[value]],
			})),
			valueInputOption,
		},
	});
}

/** Mirrors the legacy default: grow the grid by one row, then write after the last row. */
export async function appendRow(
	http: Http,
	spreadsheetId: string,
	sheet: SheetTab,
	lastRow: number,
	cells: ReadonlyArray<string | number | boolean>,
	valueInputOption: Infer<typeof cellFormat>,
) {
	await http.request({
		method: 'POST',
		path: `/${spreadsheetId}:batchUpdate`,
		body: { requests: [{ appendDimension: { sheetId: sheet.id, dimension: 'ROWS', length: 1 } }] },
	});
	await writeRow(http, spreadsheetId, sheet, lastRow, cells, valueInputOption);
}

/** The header cells. An empty sheet gets the keys of `values` as its header, like auto-map. */
export async function headerOf(
	http: Http,
	spreadsheetId: string,
	sheet: SheetTab,
	rows: readonly unknown[][],
	headerRow: number,
	values: Record<string, unknown>,
): Promise<string[]> {
	const existing = rows[headerRow - 1];
	if (existing) return existing.map(String);
	if (rows.length > 0) throw new Error(`Could not retrieve the column names from row ${headerRow}`);
	const names = Object.keys(values).filter((key) => key !== ROW_NUMBER);
	await writeRow(http, spreadsheetId, sheet, headerRow, names, 'RAW');
	return names;
}
