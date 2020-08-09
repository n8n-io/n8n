import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class CrateDb implements ICredentialType {
	name = 'crateDb';
	displayName = 'CrateDB';
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
			default: 'doc',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: 'crate',
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
			displayName: 'SSL',
			name: 'ssl',
			type: 'options' as NodePropertyTypes,
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
				},
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
