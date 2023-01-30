import type { ICredentialType, INodeProperties } from 'n8n-workflow';

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
					name: 'Allow',
					value: 'allow',
				},
				{
					name: 'Disable',
					value: 'disable',
				},
				{
					name: 'Require',
					value: 'require',
				},
				{
					name: 'Verify (Not Implemented)',
					value: 'verify',
				},
				{
					name: 'Verify-Full (Not Implemented)',
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
