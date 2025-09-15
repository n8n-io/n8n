import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AstraDBApi implements ICredentialType {
	name = 'astraDBApi';

	displayName = 'Astra DB Credentials';

	documentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/astra-db/';

	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			description: 'The Astra DB endpoint URL',
			placeholder: 'https://01234567-89ab-cdef-0123-456789abcdef-us-east-1.apps.astra.datastax.com',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Token',
			name: 'token',
			description: 'The Astra DB application token (AstraCS:...)',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Keyspace',
			name: 'keyspace',
			description: 'The Astra DB keyspace name',
			placeholder: 'default_keyspace',
			type: 'string',
			required: true,
			default: 'default_keyspace',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.endpoint }}/api/rest/v2',
			url: '/keyspaces',
			disableFollowRedirect: false,
			headers: {
				'X-Cassandra-Token': '={{ $credentials.token }}',
			},
		},
	};
}
