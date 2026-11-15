import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class NotionApi implements ICredentialType {
	name = 'notionApi';

	displayName = 'Notion API';

	documentationUrl = 'notion';

	properties: INodeProperties[] = [
		{
			displayName: 'Internal Integration Secret',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.notion.com/v1',
			url: '/users/me',
		},
	};

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Bearer ${credentials.apiKey} `,
		};

		// HTTP header names are case-insensitive. Keep the version supplied by the caller.
		const hasVersion = Object.keys(requestOptions.headers).some(
			(name) => name.toLowerCase() === 'notion-version',
		);
		if (!hasVersion) {
			requestOptions.headers = {
				...requestOptions.headers,
				'Notion-Version': '2022-02-22',
			};
		}

		return requestOptions;
	}
}
