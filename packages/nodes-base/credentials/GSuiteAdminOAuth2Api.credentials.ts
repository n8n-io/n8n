import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/admin.directory.group',
	'https://www.googleapis.com/auth/admin.directory.user',
	'https://www.googleapis.com/auth/admin.directory.domain.readonly',
	'https://www.googleapis.com/auth/admin.directory.userschema.readonly',
];

export class GSuiteAdminOAuth2Api implements ICredentialType {
	name = 'gSuiteAdminOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'G Suite Admin OAuth2 API';
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
