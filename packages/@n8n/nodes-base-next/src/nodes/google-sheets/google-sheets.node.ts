import { defineNode, defineResource, ref, t } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { GOOGLE_FILE_ID, googleFileIdOf } from '../google-file';
import { googleOAuth2 } from '../google-oauth2';

export const googleSheetsOAuth2 = googleOAuth2({
	id: 'googleSheets.oauth2',
	legacyName: 'googleSheetsOAuth2Api',
	displayName: 'Google Sheets OAuth2 API',
	hosts: ['sheets.googleapis.com'],
	scope: [
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/spreadsheets',
		'https://www.googleapis.com/auth/drive.metadata',
	],
	notice:
		'Make sure you enabled the following APIs & Services in the Google Cloud Console: Google Drive API, Google Sheets API. <a href="https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#scopes" target="_blank">More info</a>.',
});

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
});

export const spreadsheetIdOf = (value: string) => googleFileIdOf(value, 'Google Sheets');

export const sheetInput = t
	.variant('mode', {
		name: { name: t.str().hint('Exact tab name the user gave') },
		id: { id: t.str().with({ pattern: '^(gid=)?[0-9]+$' }).hint('A numeric sheet gid') },
	})
	.hint('Never assume "Sheet1"; ask when the tab name is unknown');

export const sheet = googleSheets.resource('sheet', {
	input: { spreadsheet: ref(googleSpreadsheet), sheet: sheetInput },
});
