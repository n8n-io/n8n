import { compat, credential, defineNode } from '@n8n/node-sdk';

/**
 * The built-in Google Sheets Trigger node. It compares Drive revisions of the sheet to find
 * updated rows, which the poll runtime of the SDK cannot do yet, so n8n runs the built-in node.
 * Its credentials are the trigger ones, not the credential of the Google Sheets actions.
 */
export const googleSheetsTrigger = defineNode({
	id: 'googleSheetsTrigger',
	displayName: 'Google Sheets Trigger',
	credential: credential({
		types: [compat('googleSheetsTriggerOAuth2Api'), compat('googleApi')],
	}),
});
