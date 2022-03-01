import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/cloud-language',
	'https://www.googleapis.com/auth/cloud-platform',
];

export class GoogleCloudNaturalLanguageOAuth2Api implements ICredentialType {
	name = 'googleCloudNaturalLanguageOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Cloud Natural Language OAuth2 API';
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
