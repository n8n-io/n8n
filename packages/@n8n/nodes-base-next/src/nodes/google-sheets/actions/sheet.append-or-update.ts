import { t } from '@n8n/node-sdk';

import { sheet, spreadsheetIdOf } from '../google-sheets.node';
import {
	appendRow,
	cellFormat,
	cellText,
	columnKey,
	deriveWritten,
	headerOf,
	readValues,
	rowCells,
	rowValues,
	sheetOf,
	toCell,
	updateCells,
	writtenRow,
} from '../table';

export const appendOrUpdateSheetRow = sheet.action('appendOrUpdate', {
	patch: 6,
	action: 'Append or update row',
	summary: 'Upsert: update the row whose matchOn column equals the value in values, else append.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: true },
	input: {
		values: rowValues,
		matchOn: t.str().hint('Header text of the key column; values must set it'),
		header: t
			.obj({
				headerRow: t.int().with({ minimum: 1 }).default(1),
				firstDataRow: t.int().with({ minimum: 1 }).default(2),
			})
			.optional(),
		cellFormat,
	},
	output: writtenRow,
	deriveOutput: deriveWritten,
	async run({ input, http }) {
		const { matchOn } = input;
		const key = input.values[matchOn];
		if (key === undefined || key === null || key === '') {
			throw new Error(`values needs a value for the matchOn column "${matchOn}"`);
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
			throw new Error(`Column "${matchOn}" is not in header row ${headerRow}`);
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
