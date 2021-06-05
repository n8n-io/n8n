import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class GitPassword implements ICredentialType {
	name = 'gitPassword';
	displayName = 'Git';
	properties = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
			decription: 'The username to authenticate with.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'The password to use in combination with the user',
		},
	];
}
