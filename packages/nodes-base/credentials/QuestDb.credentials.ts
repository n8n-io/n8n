import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class QuestDb implements ICredentialType {
	name = 'questDb';
	displayName = 'QuestDB';
	documentationUrl = 'questDb';
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
			default: 'qdb',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'admin',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: 'quest',
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
			default: 8812,
		},
	];
}
