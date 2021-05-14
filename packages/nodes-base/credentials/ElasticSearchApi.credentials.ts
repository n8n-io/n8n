import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ElasticSearchApi implements ICredentialType {
	name = 'elasticSearchApi';
	displayName = 'Elastic Search API';
	documentationUrl = 'elasticSearch';
	properties = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'hello@n8n.io',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://a-b-optimized-deployment-ffc9df.es.us-west1.gcp.cloud.es.io:9243',
			description: 'Referred to as \'endpoint\' in the ElasticSearch dashboard.',
		},
	];
}
