import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OktaApi implements ICredentialType {
	name = 'oktaApi';

	displayName = 'Okta API';

	icon = 'file:icons/Okta.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://dev-123456.okta.com',
		},
		{
			displayName: 'SSWS Access Token',
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
				Authorization: '=SSWS {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/api/v1/api-tokens',
		},
	};
}
