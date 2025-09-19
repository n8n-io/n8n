import type { ICredentialType, INodeProperties } from 'n8n-workflow';

// https://api.baserow.io/api/redoc/#section/Authentication

export class BaserowApi implements ICredentialType {
	name = 'baserowApi';

	displayName = 'Baserow API';

	documentationUrl = 'baserow';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'https://api.baserow.io',
		},
		{
			displayName: 'Authentication',
			name: 'authType',
			type: 'options',
			options: [
				{ name: 'Username & Password', value: 'basic' },
				{ name: 'API Token', value: 'token' },
			],
			default: 'basic',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			description: 'Email address you use to login to Baserow.',
			displayOptions: {
				show: { authType: ['basic'] },
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: { authType: ['basic'] },
			},
		},
		{
			displayName: 'Database Token',
			name: 'token',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			description:
				'In Baserow, click on top left corner, My settings, Database tokens, Create new.',
			displayOptions: {
				show: { authType: ['token'] },
			},
		},
	];
}
