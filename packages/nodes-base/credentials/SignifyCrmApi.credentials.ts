import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SignifyCrmApi implements ICredentialType {

	name = 'signifyCrmApi';
	displayName = 'SignifyCRM API';
	documentationUrl = '';

	properties: INodeProperties[] = [
        {
			displayName: 'Site URL',
			name: 'siteUrl',
			type: 'string',
			default: '',
            required: true,
			placeholder: 'htpps://example.signifycrm.com',
			description:
				'If the domain is https://example.signifycrm.com "example" would have to be entered',
		},
        {
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
            required: true,
			placeholder: '1234567890',
			default: '',
		},
        {
			displayName: 'Username',
			name: 'username',
			type: 'string',
            required: true,
			placeholder: 'Username',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
            required: true,
			typeOptions: { password: true },
			default: '',
		},
	];
}
