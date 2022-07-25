import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/drive',
	'https://www.googleapis.com/auth/drive.appdata',
	'https://www.googleapis.com/auth/drive.photos.readonly',
];

export class GoogleDriveOAuth2Api implements ICredentialType {
	name = 'googleDriveOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Drive OAuth2 API';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
