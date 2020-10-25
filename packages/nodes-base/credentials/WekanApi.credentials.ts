import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class WekanApi implements ICredentialType {
	name = 'wekanApi';
	displayName = 'Wekan API';
	documentationUrl = 'wekan';
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
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://wekan.yourdomain.com',
		},
	];
}
