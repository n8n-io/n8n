import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ElasticsearchApi implements ICredentialType {
	name = 'elasticsearchApi';
	displayName = 'Elasticsearch API';
	documentationUrl = 'elasticsearch';
	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://abc.elastic-cloud.com:9243',
			description: 'Referred to as \'endpoint\' in the Elasticsearch dashboard.',
		},
	];
}
