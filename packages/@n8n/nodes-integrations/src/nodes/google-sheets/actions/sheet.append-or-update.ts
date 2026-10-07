import { t, UserError } from '@n8n/node-sdk';

import { sheet, spreadsheetIdOf } from '../google-sheets.node';
import {
	appendRow,
	cellFormat,
	cellText,
	columnKey,
	deriveWritten,
	headerKeysOf,
	headerOf,
	headerValuesOf,
	readValues,
	rowCells,
	rowValues,
	sheetOf,
	toCell,
	updateCells,
	writtenRow,
} from '../table';

export const appendOrUpdateSheetRow = sheet.action('appendOrUpdate', {
	// Minor 1: an ID of any length, and the ID after /d/ in a URL.
	version: '1.3.0',
	action: 'Append or update row',
	summary: 'Upsert: update the row whose matchOn column equals the value in values, else append.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: true },
	input: {
		values: rowValues,
		matchOn: t
			.str()
			.title('Column to Match On')
			.hint('Header text of the key column; values must set it'),
		header: t
			.obj({
				headerRow: t.int().with({ minimum: 1 }).default(1).title('Header Row'),
				firstDataRow: t.int().with({ minimum: 1 }).default(2).title('First Data Row'),
			})
			.title('Data Location on Sheet')
			.optional(),
		cellFormat,
	},
	output: writtenRow,
	deriveOutput: deriveWritten,
	resourceInput: {
		input: 'sheet',
		toInput(fields, { header }) {
			const keys = headerKeysOf(fields, header?.headerRow);
			return keys.length > 0
				? { values: headerValuesOf(keys), matchOn: { type: 'string', enum: keys } }
				: {};
		},
	},
	async run({ input, http }) {
		const { matchOn } = input;
		const key = input.values[matchOn];
		if (key === undefined || key === null || key === '') {
			throw new UserError(`values needs a value for the matchOn column "${matchOn}"`);
		}
		const spreadsheetId = spreadsheetIdOf(input.spreadsheet);
		const tab = await sheetOf(http, spreadsheetId, input.sheet);
		// Unformatted, so a number key matches a cell that shows "1,000".
		const rows = await readValues(http, spreadsheetId, tab, 'UNFORMATTED_VALUE');
		const headerRow = input.header?.headerRow ?? 1;
		const firstDataRow = input.header?.firstDataRow ?? 2;
		// Check before `headerOf` adds columns: a new key column matches no row.
		const known = (rows[headerRow - 1] ?? []).map(columnKey);
		if (known.some(Boolean) && !known.includes(matchOn)) {
			throw new UserError(`Column "${matchOn}" is not in header row ${headerRow}`);
		}
		const header = await headerOf(http, spreadsheetId, tab, rows, headerRow, input.values);
		const keyColumn = header.indexOf(matchOn);
		// Legacy mapping mode writes empty cells for null values instead of skipping them.
		const values = Object.fromEntries(
			Object.entries(input.values).map(([name, value]) => [name, value ?? '']),
		);
		const index = rows
			.slice(firstDataRow - 1)
			.findIndex(
				(row) => row[keyColumn] !== undefined && cellText(row[keyColumn]) === cellText(key),
			);
		if (index === -1) {
			const lastRow = Math.max(rows.length, headerRow) + 1;
			const cells = rowCells(header, values);
			await appendRow(http, spreadsheetId, tab, lastRow, cells, input.cellFormat);
		} else {
			const cells = header.flatMap((name, column) =>
				name === matchOn || values[name] === undefined || header.indexOf(name) !== column
					? []
					: [{ column, row: index + firstDataRow, value: toCell(values[name]) }],
			);
			if (cells.length) await updateCells(http, spreadsheetId, tab, cells, input.cellFormat);
		}
		return values;
	},
});
