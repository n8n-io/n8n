import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes: { [key: string]: string[] } = {
	"Read & Write": [
		'https://www.googleapis.com/auth/presentations',
	],
	"Read Only": [
		'https://www.googleapis.com/auth/presentations.readonly',
	],
	"n8n Slides Only": [
		'https://www.googleapis.com/auth/drive.file',
	],
};

export class GoogleSlidesOAuth2Api implements ICredentialType {
	name = 'googleSlidesOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Slides OAuth2 API';
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
