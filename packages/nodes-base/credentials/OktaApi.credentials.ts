import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OktaApi implements ICredentialType {
	name = 'oktaApi';

	displayName = 'Okta API';

	icon = 'file:Okta.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Okta Domain',
			name: 'oktaDomain',
			type: 'string',
			default: '',
			placeholder: 'https://dev-123456.okta.com',
		},
		{
			displayName: 'SSWS Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=SSWS {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.oktaDomain}}',
			url: '/api/v1/api-tokens',
		},
	};
}
