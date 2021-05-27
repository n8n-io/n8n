import {
	ICredentialType,
	NodePropertyTypes,
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
	properties = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
		},
	];
}
