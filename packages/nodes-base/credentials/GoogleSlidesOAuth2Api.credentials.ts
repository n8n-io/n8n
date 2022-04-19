import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/drive.file',
	'https://www.googleapis.com/auth/presentations',
];

export class GoogleSlidesOAuth2Api implements ICredentialType {
	name = 'googleSlidesOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Slides OAuth2 API';
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
