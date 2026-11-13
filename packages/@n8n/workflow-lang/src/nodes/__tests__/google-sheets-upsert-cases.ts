/** Equivalence cases of Google Sheets `sheet.appendOrUpdate` (append or update row). */
import type { EquivalenceCase } from './equivalence.ts';

const credential = {
	type: 'googleSheetsOAuth2Api',
	data: { oauthTokenData: { access_token: 'fake-sheets-token', token_type: 'Bearer' } },
};
const meta = {
	body: {
		sheets: [
			{ properties: { sheetId: 0, title: 'Sheet1' } },
			{ properties: { sheetId: 123, title: 'Sales Q1' } },
		],
	},
};
const data = {
	body: {
		values: [
			['Name', 'Count', 'Note'],
			['Ada', '1'],
			['Bob', '2', 'old'],
		],
	},
};
const base = {
	type: 'n8n-nodes-base.googleSheets',
	credential,
};
const target = {
	resource: 'sheet',
	operation: 'appendOrUpdate',
	documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
	sheetName: { __rl: true, mode: 'id', value: '123' },
};
const schema = [
	{ id: 'Name', displayName: 'Name', type: 'string', required: false, display: true },
	{ id: 'Count', displayName: 'Count', type: 'string', required: false, display: true },
	{ id: 'Note', displayName: 'Note', type: 'string', required: false, display: true },
];

export const SHEETS_UPSERT_CASES: EquivalenceCase[] = [
	{
		...base,
		name: 'googleSheets sheet.appendOrUpdate updates a matching row',
		typeVersion: 4.7,
		parameters: {
			...target,
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: 'Bob', Count: 7, Note: null },
				matchingColumns: ['Name'],
				schema,
			},
			options: {},
		},
		items: [{ a: 1 }, { a: 2 }],
		responses: [meta, data, { body: { totalUpdatedCells: 2 } }],
	},
	{
		...base,
		name: 'googleSheets sheet.appendOrUpdate appends a new key',
		typeVersion: 4.5,
		parameters: {
			...target,
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: 'Zed', Count: '3' },
				matchingColumns: ['Name'],
				schema,
			},
			options: { cellFormat: 'RAW' },
		},
		responses: [meta, data, { body: {} }, { body: { updatedRows: 1 } }],
	},
	{
		...base,
		name: 'googleSheets sheet.appendOrUpdate auto-map with a new column',
		typeVersion: 4.7,
		parameters: {
			...target,
			columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: ['Name'], schema },
			options: {},
		},
		items: [
			{ Name: 'Bob', Count: 5, Extra: 'x', row_number: 3 },
			{ Name: 'Dan', Extra: { k: 1 } },
		],
		responses: [
			meta,
			data,
			{ body: {} },
			{ body: { totalUpdatedCells: 2 } },
			{ body: {} },
			{ body: { updatedRows: 1 } },
		],
	},
	{
		...base,
		name: 'googleSheets sheet.appendOrUpdate with append and a header row',
		typeVersion: 4.3,
		parameters: {
			...target,
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: 'Ada', Count: 4 },
				matchingColumns: ['Name'],
				schema,
			},
			options: { useAppend: true, locationDefine: { values: { headerRow: 1, firstDataRow: 2 } } },
		},
		items: [{ a: 1 }],
		responses: [meta, data, { body: { totalUpdatedCells: 1 } }],
	},
];
