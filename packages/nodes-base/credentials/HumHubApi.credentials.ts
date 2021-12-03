import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HumHubApi implements ICredentialType {
	name = 'humhubApi';
	displayName = 'HumHub API';
	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			required: true,
			default: '',
			description: 'Your username or email address.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			required: true,
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your password.',
		},
		{
			displayName: 'HumHub URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://example.humhub.com',
		},
	];
}
