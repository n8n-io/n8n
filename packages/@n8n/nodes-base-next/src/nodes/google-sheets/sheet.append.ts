import { defineAction, int, ref } from '@n8n/node-sdk';

import {
	appendRow,
	cellFormat,
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
	writtenRow,
} from './node';

export const appendSheetRow = defineAction({
	node: googleSheets,
	id: 'googleSheets.sheet.append',
	action: 'Append row',
	summary: 'Append one row per item. Never updates existing rows; use appendOrUpdate to upsert.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace', idempotent: false },
	input: {
		spreadsheet: ref(googleSpreadsheet),
		sheet: sheetInput,
		values: rowValues,
		headerRow: int().with({ minimum: 1 }).default(1),
		cellFormat,
	},
	output: writtenRow,
	deriveOutput: deriveWritten,
	async run({ input, http, emit }) {
		const spreadsheetId = spreadsheetIdOf(input.spreadsheet);
		const sheet = await sheetOf(http, spreadsheetId, input.sheet);
		const rows = await readValues(http, spreadsheetId, sheet, 'FORMATTED_VALUE');
		const headerRow = input.headerRow ?? 1;
		const header = await headerOf(http, spreadsheetId, sheet, rows, headerRow, input.values);
		const lastRow = Math.max(rows.length, headerRow) + 1;
		const cells = header.map((name) => toCell(input.values[name]));
		await appendRow(http, spreadsheetId, sheet, lastRow, cells, input.cellFormat ?? 'USER_ENTERED');
		emit(input.values);
	},
});
