import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VirusTotalApi implements ICredentialType {
	name = 'virusTotalApi';

	displayName = 'Virus Total API';

	documentationUrl = 'virustotal';

	icon = 'file:icons/VirusTotal.svg';

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
