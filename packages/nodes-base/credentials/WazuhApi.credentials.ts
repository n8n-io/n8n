import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class WazuhApi implements ICredentialType {
	name = 'wazuhApi';

	displayName = 'Wazuh API';

	documentationUrl = 'wazuh';

	icon = 'file:icons/Wazuh.png';

	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'https://localhost:55000',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = credentials.url as string;
		const response = await this.helpers.httpRequest({
			method: 'POST',
			url: `${url.endsWith('/') ? url.slice(0, -1) : url}/security/user/authenticate`,
			body: {
				username: credentials.username,
				password: credentials.password,
			},
		});
		return { token: response.data.token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: 'Bearer ={{$credentials.token}}',
			},
		},
	};
}
