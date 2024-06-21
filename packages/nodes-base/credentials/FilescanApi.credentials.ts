import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class FilescanApi implements ICredentialType {
	name = 'filescanApi';

	displayName = 'Filescan API';

	documentationUrl = 'filescan';

	icon = { light: 'file:icons/Filescan.svg', dark: 'file:icons/Filescan.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			'X-Api-Key': credentials.apiKey,
		};

		if (requestOptions.method === 'GET') {
			delete requestOptions.body;
		}

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.filescan.io/api',
			url: '/system/do-healthcheck',
			method: 'GET',
		},
	};
}
