import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes: { [key: string]: string[] } = {
	"Read & Write": [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.appdata',
		'https://www.googleapis.com/auth/drive.photos.readonly',
		'https://www.googleapis.com/auth/drive.activity',
	],
	"Read Only": [
		'https://www.googleapis.com/auth/drive.readonly',
		'https://www.googleapis.com/auth/drive.photos.readonly',
		'https://www.googleapis.com/auth/drive.activity.readonly',
	],
	"n8n Files Only": [
		'https://www.googleapis.com/auth/drive.file',
	],
};

export class GoogleDriveOAuth2Api implements ICredentialType {
	name = 'googleDriveOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Drive OAuth2 API';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'options',
			options: Object.entries(scopes).map(x => ({name: x[0], value: x[1].join(' ')})),
			default: 'Read & Write',
		},
	];
}
