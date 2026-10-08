import { googleOAuth2 } from '../google-oauth2';

export const googleSheetsTriggerOAuth2 = googleOAuth2({
	id: 'googleSheetsTrigger.oauth2',
	legacyName: 'googleSheetsTriggerOAuth2Api',
	displayName: 'Google Sheets Trigger OAuth2 API',
	scope: [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/spreadsheets',
		'https://www.googleapis.com/auth/drive.metadata',
	],
	notice:
		'Make sure you have enabled the following APIs & Services in the Google Cloud Console: Google Drive API, Google Sheets API. <a href="https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#scopes" target="_blank">More info</a>.',
});
