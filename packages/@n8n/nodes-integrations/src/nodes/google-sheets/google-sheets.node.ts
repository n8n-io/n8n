import { defineNode, defineResource, ref, t } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { GOOGLE_FILE_ID, GOOGLE_FILE_URL_ID, googleFileIdOf } from '../google-file';
import { googleSheetsOAuth2 } from './credentials';

export const googleSheets = defineNode({
	id: 'googleSheets',
	displayName: 'Google Sheets',
	credential: credential({ types: [googleSheetsOAuth2] }),
	baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
});

export const googleSpreadsheet = defineResource({
	id: 'googleSheets.spreadsheet',
	label: 'Spreadsheet',
	shape: { pattern: GOOGLE_FILE_ID, 'x-n8n-hint': 'Spreadsheet ID or Google Sheets URL' },
	extract: GOOGLE_FILE_URL_ID,
});

export const spreadsheetIdOf = (value: string) => googleFileIdOf(value, 'Google Sheets');

const tabList = {
	request: { path: '/{spreadsheet}', query: { fields: 'sheets.properties(sheetId,title)' } },
	response: t.obj({
		sheets: t.arr(t.obj({ properties: t.obj({ sheetId: t.int(), title: t.str() }) })),
	}),
	items: 'sheets',
	search: 'label',
} as const;

/** A tab of a spreadsheet by its gid. The lookup lists the tabs of the spreadsheet of the action. */
export const googleSheet = defineResource({
	id: 'googleSheets.sheet',
	label: 'Sheet',
	shape: { pattern: '^(gid=)?[0-9]+$', 'x-n8n-hint': 'A numeric sheet gid' },
	input: { spreadsheet: ref(googleSpreadsheet) },
	list: { ...tabList, item: { id: '{properties.sheetId}', label: '{properties.title}' } },
});

/**
 * A tab of a spreadsheet by its name. The field lookup reads the header cells in row 1, so a
 * build can type the keys of a row.
 */
export const googleSheetName = defineResource({
	id: 'googleSheets.sheetName',
	label: 'Sheet',
	shape: { 'x-n8n-hint': 'Exact tab name the user gave' },
	input: { spreadsheet: ref(googleSpreadsheet) },
	list: { ...tabList, item: { id: '{properties.title}', label: '{properties.title}' } },
	fields: {
		// One entry per column, so an empty cell gives an empty entry, not a shift.
		requests: [{ path: "/{spreadsheet}/values/'{id}'!1:1", query: { majorDimension: 'COLUMNS' } }],
		response: t.obj({ values: t.arr(t.arr(t.str())).optional() }),
		items: 'values',
		item: { name: '{0}', value: '{0}' },
	},
});

export const sheetInput = t
	.variant('mode', {
		name: { name: ref(googleSheetName).title('Sheet Name') },
		id: { id: ref(googleSheet).title('Sheet ID') },
	})
	.title('Sheet')
	.hint('Never assume "Sheet1"; ask when the tab name is unknown');

export const sheet = googleSheets.resource('sheet', {
	input: { spreadsheet: ref(googleSpreadsheet).title('Document'), sheet: sheetInput },
});
