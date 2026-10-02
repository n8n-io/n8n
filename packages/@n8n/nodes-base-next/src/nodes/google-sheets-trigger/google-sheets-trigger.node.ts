import { defineNode } from '@n8n/node-sdk';
import { compat, credential } from '@n8n/node-sdk/credentials';

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

/**
 * The built-in Google Sheets Trigger node. It compares Drive revisions of the sheet to find
 * updated rows, which the poll runtime of the SDK cannot do yet, so n8n runs the built-in node.
 * Its credentials are the trigger ones, not the credential of the Google Sheets actions.
 */
export const googleSheetsTrigger = defineNode({
	id: 'googleSheetsTrigger',
	displayName: 'Google Sheets Trigger',
	credential: credential({
		types: [googleSheetsTriggerOAuth2, compat('googleApi')],
	}),
});
