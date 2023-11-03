import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class QdrantApi implements ICredentialType {
	name = 'qdrantApi';

	displayName = 'Qdrant';

	documentationUrl = 'qdrantApi';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Cluster Host',
			name: 'clusterHost',
			type: 'string',
			default: 'REPLACE-WITH-YOUR-CLUSTER-HOST-URL.us-east4-0.gcp.cloud.qdrant.io',
			description: 'The URL of your Qdrant cluster, without the protocol and port.',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ "https://" + $credentials.clusterHost.replace(new RegExp("/$"), "") }}',
			url: '/collections',
			method: 'GET',
		},
	};
}
