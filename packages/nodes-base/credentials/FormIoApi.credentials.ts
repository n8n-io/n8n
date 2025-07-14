import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FormIoApi implements ICredentialType {
	name = 'formIoApi';

	displayName = 'Form.io API';

	documentationUrl = 'formIoTrigger';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'cloudHosted',
			options: [
				{
					name: 'Cloud-Hosted',
					value: 'cloudHosted',
				},
				{
					name: 'Self-Hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Self-Hosted Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://www.mydomain.com',
			displayOptions: {
				show: {
					environment: ['selfHosted'],
				},
			},
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
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
