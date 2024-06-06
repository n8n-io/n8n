import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class CrowdStrikeOAuth2Api implements ICredentialType {
	name = 'crowdStrikeOAuth2Api';

	displayName = 'CrowdStrike OAuth2 API';

	documentationUrl = 'crowdstrike';

	icon = { light: 'file:icons/CrowdStrike.svg', dark: 'file:icons/CrowdStrike.dark.svg' } as const;

	httpRequestNode = {
		name: 'CrowdStrike',
		docsUrl: 'https://developer.crowdstrike.com/',
		apiBaseUrl: '',
	};

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
			displayName: 'URL',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
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
		const url = credentials.url as string;
		const { access_token } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${url.endsWith('/') ? url.slice(0, -1) : url}/oauth2/token`,
			body: {
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
			},
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
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
			baseURL: '={{$credentials?.url}}',
			url: 'user-management/queries/users/v1',
		},
	};
}
