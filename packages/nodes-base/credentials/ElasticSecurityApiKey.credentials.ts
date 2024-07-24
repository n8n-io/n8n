/* eslint-disable n8n-nodes-base/cred-filename-against-convention */
import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ElasticApi implements ICredentialType {
	name = 'elasticApi';

	displayName = 'Elastic API';

	documentationUrl = 'elastic';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'e.g. https://mydeployment.kb.us-central1.gcp.cloud.es.io:9243',
			description: "Referred to as Kibana 'endpoint' in the Elastic deployment dashboard",
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=ApiKey {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/endpoint/metadata',
			method: 'GET',
		},
	};
}
