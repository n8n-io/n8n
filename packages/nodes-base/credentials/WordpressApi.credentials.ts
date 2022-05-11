import { IHttpRequestOptions } from 'n8n-workflow';
import {
	IAuthenticateBasicAuth,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WordpressApi implements ICredentialType {
	name = 'wordpressApi';
	displayName = 'Wordpress API';
	documentationUrl = 'wordpress';
	properties: INodeProperties[] = [
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
			displayName: 'Wordpress URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
		},
	];
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/v2/users',
		},
	};
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.auth = {
			// @ts-ignore
			user: credentials.username as string,
			password: credentials.password as string,
		};
		return requestOptions;
	}
}

