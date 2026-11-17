/**
 * Equivalence cases of Google Sheets `sheet.append` that depend on the columns
 * of the sheet.
 *
 * - Version 4.0 (and up to 4.3) reads the columns of the row from the sheet and
 *   writes no schema check, so a `defineBelow` mapping needs no schema.
 * - Version 4.4 and later checks the schema against the row (v1's
 *   `checkForSchemaChanges`): the same columns in another order pass, an extra
 *   sheet column passes, and a schema column that the sheet no longer holds
 *   fails.
 *
 * The v1 node gets its version from the workflow, and the library node gets it
 * as the markers that the converter adds (`schemaCheck` from version 4.4,
 * `legacyCellFormat` before version 4.1). A case writes the marker itself,
 * because the test runs the library node with the parameters of the case.
 */
import type { EquivalenceCase } from './equivalence.ts';

const credential = {
	type: 'googleSheetsOAuth2Api',
	data: { oauthTokenData: { access_token: 'fake-sheets-token', token_type: 'Bearer' } },
};
const meta = {
	body: {
		sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }],
	},
};
const base = {
	type: 'n8n-nodes-base.googleSheets',
	credential,
};
const target = {
	resource: 'sheet',
	operation: 'append',
	documentId: { __rl: true, mode: 'id', value: 'doc1' },
	sheetName: { __rl: true, mode: 'name', value: 'Sheet1' },
};
/** The five columns of the sheet as the resource mapper lists them. */
const schema = ['A', 'B', 'C', 'D', 'E'].map((id) => ({
	id,
	displayName: id,
	type: 'string',
	required: false,
	display: true,
	defaultMatch: false,
	canBeUsedToMatch: true,
}));
const values = { A: 'a1', B: 'b1', C: 'c1', D: 'd1', E: 'e1' };

export const SHEETS_APPEND_CASES: EquivalenceCase[] = [
	{
		...base,
		name: 'googleSheets sheet.append v4.0 define below without a schema',
		typeVersion: 4,
		parameters: {
			...target,
			columns: {
				mappingMode: 'defineBelow',
				value: { date: '2024-01-01', email: 'ada@example.com', name: 'Ada' },
			},
			options: {},
			// v1 sends the cells as RAW before version 4.1 (cellFormatDefault).
			legacyCellFormat: true,
		},
		responses: [
			meta,
			{
				body: {
					values: [
						['date', 'email', 'name'],
						['2023-12-31', 'bob@example.com', 'Bob'],
					],
				},
			},
			{ body: {} },
			{ body: { updatedRows: 1 } },
		],
	},
	{
		...base,
		name: 'googleSheets sheet.append v4.4 define below without a schema',
		typeVersion: 4.4,
		parameters: {
			...target,
			columns: {
				mappingMode: 'defineBelow',
				value: { A: 'a1' },
			},
			options: {},
			schemaCheck: true,
		},
		responses: [meta, { body: { values: [['A', 'B', 'C', 'D', 'E']] } }],
		expectedError: '`columns.schema` is required when `columns.mappingMode` is `defineBelow`',
	},
	{
		...base,
		name: 'googleSheets sheet.append v4.7 columns in another order and one more in the sheet',
		typeVersion: 4.7,
		parameters: {
			...target,
			columns: { mappingMode: 'defineBelow', value: values, schema },
			options: {},
			schemaCheck: true,
		},
		responses: [
			meta,
			{
				body: {
					values: [
						['C', 'A', 'B', 'E', 'D', 'Extra'],
						['c0', 'a0', 'b0', 'e0', 'd0', 'x'],
					],
				},
			},
			{ body: {} },
			{ body: { updatedRows: 1 } },
		],
	},
	{
		...base,
		name: 'googleSheets sheet.append v4.7 with a column that the sheet no longer has',
		typeVersion: 4.7,
		parameters: {
			...target,
			columns: { mappingMode: 'defineBelow', value: values, schema },
			options: {},
			schemaCheck: true,
		},
		responses: [meta, { body: { values: [['A', 'B', 'C']] } }],
		expectedError: "Column names were updated after the node's setup",
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.clear whole sheet',
		parameters: { ...target, operation: 'clear' },
		items: [{ a: 1 }, { a: 2 }],
		responses: [meta, { body: { clearedRange: 'Sheet1!A1:Z1000' } }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.clear whole sheet and keep the first row',
		parameters: { ...target, operation: 'clear', clear: 'wholeSheet', keepFirstRow: true },
		responses: [meta, { body: { values: [['Name', 'Count']] } }, { body: {} }, { body: {} }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.clear rows',
		parameters: {
			...target,
			operation: 'clear',
			clear: 'specificRows',
			startIndex: 3,
			rowsToDelete: 4,
		},
		responses: [meta, { body: {} }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.clear columns',
		parameters: {
			...target,
			operation: 'clear',
			clear: 'specificColumns',
			startIndex: 'Y',
			columnsToDelete: 3,
		},
		responses: [meta, { body: {} }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.clear one column',
		parameters: { ...target, operation: 'clear', clear: 'specificColumns', startIndex: 'B' },
		responses: [meta, { body: {} }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.clear a range with a sheet name in it',
		parameters: { ...target, operation: 'clear', clear: 'specificRange', range: 'Other!B2:C9' },
		responses: [meta, { body: {} }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.clear the default range',
		parameters: { ...target, operation: 'clear', clear: 'specificRange' },
		responses: [meta, { body: {} }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.delete rows',
		parameters: {
			...target,
			operation: 'delete',
			toDelete: 'rows',
			startIndex: 5,
			numberToDelete: 3,
		},
		items: [{ a: 1 }, { a: 2 }],
		responses: [meta, { body: { replies: [{}] } }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.delete one row by default',
		parameters: { ...target, operation: 'delete' },
		responses: [meta, { body: {} }],
	},
	{
		...base,
		typeVersion: 4.7,
		name: 'googleSheets sheet.delete columns',
		parameters: {
			...target,
			operation: 'delete',
			toDelete: 'columns',
			startIndex: 'AB',
			numberToDelete: 2,
		},
		responses: [meta, { body: {} }],
	},
];
