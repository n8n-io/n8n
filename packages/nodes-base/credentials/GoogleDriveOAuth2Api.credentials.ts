import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/drive',
	'https://www.googleapis.com/auth/drive.appdata',
	'https://www.googleapis.com/auth/drive.photos.readonly',
];

export class GoogleDriveOAuth2Api implements ICredentialType {
	name = 'googleDriveOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google Drive OAuth2 API';

	documentationUrl = 'google/oauth-single-service';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
		{
			displayName:
				'Make sure that you have enabled the Google Drive API in the Google Cloud Console. <a href="https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#scopes" target="_blank">More info</a>.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
