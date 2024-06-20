import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class VirusTotalApi implements ICredentialType {
	name = 'virusTotalApi';

	displayName = 'VirusTotal API';

	documentationUrl = 'virustotal';

	icon: Icon = 'file:icons/VirusTotal.svg';

	httpRequestNode = {
		name: 'VirusTotal',
		docsUrl: 'https://developers.virustotal.com/reference/overview',
		apiBaseUrl: 'https://www.virustotal.com/api/v3/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-apikey': '={{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.virustotal.com/api/v3',
			url: '/popular_threat_categories',
		},
	};
}
