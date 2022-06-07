import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class MetabaseApi implements ICredentialType {
	name = 'metabaseApi';
	displayName = 'Metabase API';
	documentationUrl = 'metabase';
	properties: INodeProperties[] = [
					{
							displayName: 'Session Token',
							name: 'sessionToken',
							type: 'hidden',
							default: '',
					},
					{
							displayName: 'URL',
							name: 'url',
							type: 'string',
							default: '',
							placeholder: 'http://localhost:3000',
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
	];
	async preAuthentication(
			this: IHttpRequestHelper,
			credentials: ICredentialDataDecryptedObject,
			forcedRefresh: boolean) {
					if (!forcedRefresh && credentials.sessionToken) {
							return {};
					}
					const { id } = await this.helpers.httpRequest({
							method: 'POST',
							url: '={{$credentials.url.replace(new RegExp("/$"), "") + "/api/session" }}',
							body: {
									username: credentials.username,
									password: credentials.password,
							},
					}) as { id: string };
					return { sessionToken: id};
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url.replace(new RegExp("/$"), "")}}',
			url: '/api/user/current',
		},
	};
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
			requestOptions.headers!['X-Metabase-Session'] = credentials.sessionToken;
			return requestOptions;
	}
}
