import { defineAction, int, obj, ref, str } from '@n8n/node-sdk';

import {
	appendRow,
	cellFormat,
	cellText,
	deriveWritten,
	googleSheets,
	googleSpreadsheet,
	headerOf,
	readValues,
	rowValues,
	sheetInput,
	sheetOf,
	spreadsheetIdOf,
	toCell,
	updateCells,
	writtenRow,
} from './node';

export const appendOrUpdateSheetRow = defineAction({
	node: googleSheets,
	id: 'googleSheets.sheet.appendOrUpdate',
	action: 'Append or update row',
	summary: 'Upsert: update the row whose matchOn column equals the value in values, else append.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace', idempotent: true },
	input: {
		spreadsheet: ref(googleSpreadsheet),
		sheet: sheetInput,
		values: rowValues,
		matchOn: str().hint('Header text of the key column; values must set it'),
		header: obj({
			headerRow: int().with({ minimum: 1 }).default(1),
			firstDataRow: int().with({ minimum: 1 }).default(2),
		}).optional(),
		cellFormat,
	},
	output: writtenRow,
	deriveOutput: deriveWritten,
	async run({ input, http, emit }) {
		const { matchOn } = input;
		const key = input.values[matchOn];
		if (key === undefined || key === null || key === '') {
			throw new Error(`values needs a value for the matchOn column "${matchOn}"`);
		}
		const spreadsheetId = spreadsheetIdOf(input.spreadsheet);
		const sheet = await sheetOf(http, spreadsheetId, input.sheet);
		const rows = await readValues(http, spreadsheetId, sheet, 'FORMATTED_VALUE');
		const headerRow = input.header?.headerRow ?? 1;
		const firstDataRow = input.header?.firstDataRow ?? 2;
		const header = await headerOf(http, spreadsheetId, sheet, rows, headerRow, input.values);
		const keyColumn = header.indexOf(matchOn);
		if (keyColumn === -1) throw new Error(`Column "${matchOn}" is not in header row ${headerRow}`);
		// Legacy mapping mode writes empty cells for null values instead of skipping them.
		const values = Object.fromEntries(
			Object.entries(input.values).map(([name, value]) => [name, value ?? '']),
		);
		const format = input.cellFormat ?? 'USER_ENTERED';
		const index = rows
			.slice(firstDataRow - 1)
			.findIndex(
				(row) => row[keyColumn] !== undefined && cellText(row[keyColumn]) === cellText(key),
			);
		if (index === -1) {
			const lastRow = Math.max(rows.length, headerRow) + 1;
			const cells = header.map((name) => toCell(values[name]));
			await appendRow(http, spreadsheetId, sheet, lastRow, cells, format);
		} else {
			const cells = header.flatMap((name, column) =>
				name === matchOn || values[name] === undefined
					? []
					: [{ column, row: index + firstDataRow, value: toCell(values[name]) }],
			);
			if (cells.length) await updateCells(http, spreadsheetId, sheet, cells, format);
		}
		emit(values);
	},
});
