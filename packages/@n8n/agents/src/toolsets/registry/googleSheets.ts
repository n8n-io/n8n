import type { AppDefinition } from '../types';

export const GOOGLE_SHEETS_APP: AppDefinition = {
	kind: 'googleSheets',
	nodeType: 'n8n-nodes-base.googleSheets',
	nodeTypeVersion: 4.7,
	credentialType: 'googleSheetsOAuth2Api',
};
