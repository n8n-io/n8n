import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ElasticsearchApi implements ICredentialType {
	name = 'elasticsearchApi';
	displayName = 'Elasticsearch API';
	documentationUrl = 'elasticsearch';
	properties = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
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
			placeholder: 'https://abc.elastic-cloud.com:9243',
			description: 'Referred to as \'endpoint\' in the Elasticsearch dashboard.',
		},
	];
}
