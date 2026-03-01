import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class Auth0ManagementApi implements ICredentialType {
	name = 'auth0ManagementApi';

	displayName = 'Auth0 Management API';

	documentationUrl = 'auth0management';

	icon = { light: 'file:icons/Auth0.svg', dark: 'file:icons/Auth0.dark.svg' } as const;

	httpRequestNode = {
		name: 'Auth0',
		docsUrl: 'https://auth0.com/docs/api/management/v2',
		apiBaseUrlPlaceholder: 'https://your-tenant.auth0.com/api/v2/users/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Auth0 Domain',
			name: 'domain',
			type: 'string',
			required: true,
			default: 'your-domain.eu.auth0.com',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const { access_token } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `https://${credentials.domain}/oauth/token`,
			body: {
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
				audience: `https://${credentials.domain}/api/v2/`,
				grant_type: 'client_credentials',
			},
			headers: {
				'Content-Type': 'application/json',
			},
		})) as { access_token: string };
		return { sessionToken: access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.sessionToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.domain}}',
			url: '/api/v2/clients',
		},
	};
}
