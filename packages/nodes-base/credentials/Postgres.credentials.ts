import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Postgres implements ICredentialType {
	name = 'postgres';
	displayName = 'Postgres';
	documentationUrl = 'postgres';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: 'localhost',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string' as NodePropertyTypes,
			default: 'postgres',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: 'postgres',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Connect even if SSL certificate validation is not possible.',
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'options' as NodePropertyTypes,
			displayOptions: {
				show: {
					allowUnauthorizedCerts: [
						false,
					],
				},
			},
			options: [
				{
					name: 'disable',
					value: 'disable',
				},
				{
					name: 'allow',
					value: 'allow',
				},
				{
					name: 'require',
					value: 'require',
				},
				{
					name: 'verify (not implemented)',
					value: 'verify',
				},
				{
					name: 'verify-full (not implemented)',
					value: 'verify-full',
				}
			],
			default: 'disable',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 5432,
		},
	];
}
