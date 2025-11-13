import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SchemaRegistryApi implements ICredentialType {
	name = 'schemaRegistryApi';

	displayName = 'Schema Registry API';

	documentationUrl = 'schemaRegistry';

	properties: INodeProperties[] = [
		{
			displayName: 'Schema Registry URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://schema-registry.example.com',
			description: 'The URL of the Schema Registry',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'None',
					value: 'none',
				},
				{
					name: 'Basic Auth',
					value: 'basicAuth',
				},
			],
			default: 'none',
			description: 'Authentication method to use',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			displayOptions: {
				show: {
					authentication: ['basicAuth'],
				},
			},
			default: '',
			description: 'Username for basic authentication',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					authentication: ['basicAuth'],
				},
			},
			default: '',
			description: 'Password for basic authentication',
		},
	];
}
