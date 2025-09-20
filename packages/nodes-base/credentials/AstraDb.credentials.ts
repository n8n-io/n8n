import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AstraDb implements ICredentialType {
	name = 'astraDb';

	displayName = 'Astra DB';

	documentationUrl = 'astraDb';

	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://your-database-id-region.apps.astra.datastax.com',
			description:
				'Your Astra DB endpoint URL. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/administration/manage-application-tokens.html" target="_blank">documentation</a>',
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Your Astra DB application token. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/administration/manage-application-tokens.html" target="_blank">documentation</a>',
		},
	];
}
