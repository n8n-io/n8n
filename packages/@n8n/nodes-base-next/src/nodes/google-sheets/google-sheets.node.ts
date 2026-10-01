import { compat, credential, defineNode, defineResource, ref, str, variant } from '@n8n/node-sdk';

export const googleSheets = defineNode({
	id: 'googleSheets',
	displayName: 'Google Sheets',
	credential: credential({
		types: [compat('googleSheetsOAuth2Api', { hosts: ['sheets.googleapis.com'] })],
	}),
	baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
});

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

export const sheet = googleSheets.resource('sheet', {
	input: { spreadsheet: ref(googleSpreadsheet), sheet: sheetInput },
});
