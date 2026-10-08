import { googleOAuth2 } from '../google-oauth2';

// The legacy node creates a document through the Drive API, with the same credential.
export const googleDocsOAuth2 = googleOAuth2({
	id: 'googleDocs.oauth2',
	legacyName: 'googleDocsOAuth2Api',
	displayName: 'Google Docs OAuth2 API',
	hosts: ['docs.googleapis.com', 'www.googleapis.com'],
	scope: [
		'https://www.googleapis.com/auth/documents',
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
	],
});
