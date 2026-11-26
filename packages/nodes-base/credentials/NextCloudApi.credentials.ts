import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class NextCloudApi implements ICredentialType {
	name = 'nextCloudApi';

	displayName = 'NextCloud API';

	documentationUrl = 'nextcloud';

	properties: INodeProperties[] = [
		{
			displayName: 'Web DAV URL',
			name: 'webDavUrl',
			type: 'string',
			placeholder: 'https://nextcloud.example.com/remote.php/webdav',
			default: '',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.auth = {
			username: credentials.user as string,
			password: credentials.password as string,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			// Needs a login and a WebDAV folder, so a wrong password or a bare server URL fails the test
			method: 'PROPFIND',
			url: '={{$credentials.webDavUrl}}',
			headers: { Depth: '0' },
		},
	};
}
