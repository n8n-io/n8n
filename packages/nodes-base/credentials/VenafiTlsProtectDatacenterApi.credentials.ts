import {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class VenafiTlsProtectDatacenterApi implements ICredentialType {
	name = 'venafiTlsProtectDatacenterApi';
	displayName = 'Venafi TLS Protect Datacenter API';
	properties: INodeProperties[] = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
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
			displayName: 'Allow Self-Signed Certificates',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: true,
		},
		{
			displayName: 'Access Token',
			name: 'token',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'certificate:manage',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = `${credentials.domain}/vedauth/authorize/oauth`;

		const requestOptions: IHttpRequestOptions = {
			url,
			method: 'POST',
			json: true,
			skipSslCertificateValidation: credentials.allowUnauthorizedCerts as boolean,
			body: {
				client_id: credentials.clientId,
				username: credentials.username,
				password: credentials.password,
				scope: credentials.scope,
			},
		};

		const { access_token } = (await this.helpers.httpRequest(requestOptions)) as {
			access_token: string;
		};

		return { token: access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};
}
