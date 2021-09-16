import {
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
			placeholder: 'https://mydeployment.kb.us-central1.gcp.cloud.es.io:9243',
			description: 'Referred to as Kibana \'endpoint\' in the Elastic deployment dashboard',
		},
	];
}
