import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class WordpressApi implements ICredentialType {
	name = 'wordpressApi';
	displayName = 'Wordpress API';
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
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
