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
