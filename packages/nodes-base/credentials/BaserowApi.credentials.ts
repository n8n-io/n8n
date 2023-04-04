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
			typeOptions: {
				password: true,
			},
		},
	];
}
