import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FilescanApi implements ICredentialType {
	name = 'filescanApi';

	displayName = 'Filescan API';

	documentationUrl = 'filescan';

	icon = { light: 'file:icons/Filescan.svg', dark: 'file:icons/Filescan.svg' } as const;

	httpRequestNode = {
		name: 'Filescan',
		docsUrl: 'https://www.filescan.io/api/docs',
		apiBaseUrlPlaceholder: 'https://www.filescan.io/api/system/do-healthcheck',
	};

	properties: INodeProperties[] = [
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
				'X-Api-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.filescan.io/api',
			url: '/system/do-healthcheck',
			method: 'GET',
		},
	};
}
