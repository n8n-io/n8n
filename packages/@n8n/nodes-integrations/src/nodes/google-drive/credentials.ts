import { googleOAuth2 } from '../google-oauth2';

export const googleDriveOAuth2 = googleOAuth2({
	id: 'googleDrive.oauth2',
	legacyName: 'googleDriveOAuth2Api',
	displayName: 'Google Drive OAuth2 API',
	hosts: ['www.googleapis.com'],
	scope: [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.appdata',
		'https://www.googleapis.com/auth/drive.photos.readonly',
	],
	notice:
		'Make sure that you have enabled the Google Drive API in the Google Cloud Console. <a href="https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#scopes" target="_blank">More info</a>.',
});
