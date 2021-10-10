import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WekanApi implements ICredentialType {
	name = 'wekanApi';
	displayName = 'Wekan API';
	documentationUrl = 'wekan';
	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://wekan.yourdomain.com',
		},
	];
}
