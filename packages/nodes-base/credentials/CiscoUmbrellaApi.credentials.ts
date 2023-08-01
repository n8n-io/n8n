import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class CiscoUmbrellaApi implements ICredentialType {
	name = 'ciscoUmbrellaApi';

	displayName = 'Cisco Umbrella API';

	icon = 'file:icons/Cisco.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			// eslint-disable-next-line n8n-nodes-base/cred-class-field-type-options-password-missing
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = 'https://api.umbrella.com';
		const { access_token } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${
				url.endsWith('/') ? url.slice(0, -1) : url
			}/auth/v2/token?grant_type=client_credentials`,
			auth: {
				username: credentials.apiKey as string,
				password: credentials.secret as string,
			},
			headers: {
				'Content-Type': 'x-www-form-urlencoded',
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
			baseURL: 'https://api.umbrella.com',
			url: '/users',
		},
	};
}
