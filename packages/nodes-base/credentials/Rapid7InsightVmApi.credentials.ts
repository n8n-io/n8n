import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Rapid7InsightVmApi implements ICredentialType {
	name = 'rapid7InsightVmApi';

	displayName = 'Rapid7 InsightVM API';

	documentationUrl = 'rapid7insightvm';

	icon = {
		light: 'file:icons/Rapid7InsightVm.svg',
		dark: 'file:icons/Rapid7InsightVm.svg',
	} as const;

	httpRequestNode = {
		name: 'Rapid7 InsightVM',
		docsUrl: 'https://docs.rapid7.com/',
		apiBaseUrlPlaceholder: 'https://insight.rapid7.com/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			required: true,
			type: 'string',
			default: '',
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
				'x-api-key': '={{$credentials.apiKey}}',
				Accept: 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}'.replace(/\/$/, ''),
			url: '/validate',
			method: 'GET',
		},
	};
}
