import type { ICredentialType, INodeProperties } from 'n8n-workflow';

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
