import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SplunkApi implements ICredentialType {
	name = 'splunkApi';
	displayName = 'Splunk API';
	documentationUrl = 'splunk';
	properties: INodeProperties[] = [
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			description: 'Protocol, domain and port',
			placeholder: 'https://localhost:8089/',
			default: '',
		},
		{
			displayName: 'Allow Unauthorized Certificates',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
		},
	];
}
