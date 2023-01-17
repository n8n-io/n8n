import { ICredentialType, INodeProperties } from 'n8n-workflow';

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
			placeholder: 'e.g. https://localhost:8089',
			default: '',
		},
		{
			displayName: 'Allow Self-Signed Certificates',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			description: 'Whether to connect even if SSL certificate validation is not possible',
			default: false,
		},
	];
}
