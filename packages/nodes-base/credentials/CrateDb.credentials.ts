import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CrateDb implements ICredentialType {
	name = 'crateDb';
	displayName = 'CrateDB';
	documentationUrl = 'crateDb';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: 'doc',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'crate',
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
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'options',
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
			type: 'number',
			default: 5432,
		},
	];
}
