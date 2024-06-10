import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class RecordedFutureApi implements ICredentialType {
	name = 'recordedFutureApi';

	displayName = 'Recorded Future API';

	documentationUrl = 'recordedfuture';

	icon = {
		light: 'file:icons/RecordedFuture.svg',
		dark: 'file:icons/RecordedFuture.dark.svg',
	} as const;

	httpRequestNode = {
		name: 'Recorded Future',
		docsUrl: 'https://api.recordedfuture.com',
		apiBaseUrl: 'https://api.recordedfuture.com/v2/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'apiKey',
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
				'X-RFToken': '={{$credentials.accessToken}}',
			},
		},
	};

	// test: ICredentialTestRequest = {
	// 	request: {
	// 		baseURL: 'https://api.recordedfuture.com/v2',
	// 		url: '/alert/search?limit=1',
	// 	},
	// };
}
