import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class WordpressApi implements ICredentialType {
	name = 'wordpressApi';
	displayName = 'Wordpress API';
	documentationUrl = 'wordpress';
	properties = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Wordpress URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://example.com',
		},
	];
}
