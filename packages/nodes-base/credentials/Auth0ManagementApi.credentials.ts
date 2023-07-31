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

	icon = 'file:icons/Auth0.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
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
