import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ElasticSecurityApi implements ICredentialType {
	name = 'elasticSecurityApi';

	displayName = 'Elastic Security API';

	documentationUrl = 'elasticSecurity';

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'e.g. https://mydeployment.kb.us-central1.gcp.cloud.es.io:9243',
			description: "Referred to as Kibana 'endpoint' in the Elastic deployment dashboard",
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
			headers: {
				'kbn-xsrf': true,
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
