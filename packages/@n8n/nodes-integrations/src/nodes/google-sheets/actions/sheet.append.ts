import { t } from '@n8n/node-sdk';

import { sheet, spreadsheetIdOf } from '../google-sheets.node';
import {
	appendRow,
	cellFormat,
	deriveWritten,
	headerKeysOf,
	headerOf,
	headerValuesOf,
	readValues,
	rowCells,
	rowValues,
	sheetOf,
	writtenRow,
} from '../table';

export const appendSheetRow = sheet.action('append', {
	// Minor 1: an ID of any length, and the ID after /d/ in a URL.
	minor: 3,
	action: 'Append row',
	summary: 'Append one row per item. Never updates existing rows; use appendOrUpdate to upsert.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	input: {
		values: rowValues,
		headerRow: t.int().with({ minimum: 1 }).default(1).title('Header Row'),
		cellFormat,
	},
	output: writtenRow,
	deriveOutput: deriveWritten,
	resourceInput: {
		input: 'sheet',
		toInput(fields, { headerRow }) {
			const keys = headerKeysOf(fields, headerRow);
			return keys.length > 0 ? { values: headerValuesOf(keys) } : {};
		},
	},
	async run({ input, http }) {
		const spreadsheetId = spreadsheetIdOf(input.spreadsheet);
		const tab = await sheetOf(http, spreadsheetId, input.sheet);
		const rows = await readValues(http, spreadsheetId, tab, 'FORMATTED_VALUE');
		const { headerRow } = input;
		const header = await headerOf(http, spreadsheetId, tab, rows, headerRow, input.values);
		const lastRow = Math.max(rows.length, headerRow) + 1;
		const cells = rowCells(header, input.values);
		await appendRow(http, spreadsheetId, tab, lastRow, cells, input.cellFormat);
		return input.values;
	},
});
