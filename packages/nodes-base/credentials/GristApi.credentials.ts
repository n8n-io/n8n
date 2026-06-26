import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GristApi implements ICredentialType {
	name = 'gristApi';

	displayName = 'Grist API';

	documentationUrl = 'grist';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'In Grist, open the account menu (top right) → Account settings → Developer to create or copy your API key',
		},
		{
			displayName: 'Grist URL',
			name: 'url',
			type: 'string',
			default: 'https://api.getgrist.com',
			required: true,
			description:
				'The default works for any hosted Grist account. To restrict this connection to a single team, use https://YOUR_TEAM.getgrist.com. For a self-managed instance, use its URL (without /api and no trailing slash).',
		},
	];
}
