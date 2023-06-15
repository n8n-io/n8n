import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class CheckPointApi implements ICredentialType {
	name = 'checkPointApi';

	displayName = 'CheckPoint API';

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
			displayName: 'Server Domain',
			name: 'url',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Continue Last Session',
			name: 'continueLastSession',
			type: 'boolean',
			default: false,
			description: 'Continue the last session if there is one',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = credentials.url as string;
		const port = credentials.port as number;
		const { sid } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `https://${url.endsWith('/') ? url.slice(0, -1) : url}:${port}/web_api/login`,
			body: {
				username: credentials.username,
				password: credentials.password,
				'continue-last-session': credentials.continueLastSession,
			},
		})) as { sid: string };
		return { sessionToken: sid };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-chkp-sid': '={{$credentials.sessionToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://={{$credentials?.url}}:={{$credentials?.port}}',
			url: '/web_api/keepalive',
		},
	};
}
