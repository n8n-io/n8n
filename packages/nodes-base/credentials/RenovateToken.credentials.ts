import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RenovateToken implements ICredentialType {
	name = 'renovateToken';
	displayName = 'Renovate Token';
	documentationUrl = '';
	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Api url',
			name: 'url',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Authentication Endpoint',
			name: 'authEndpoint',
			type: 'string',
			default: '',
		},
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
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
