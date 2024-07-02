import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class MalcoreApi implements ICredentialType {
	name = 'malcoreApi';

	displayName = 'MalcoreAPI';

	documentationUrl = 'malcore';

	icon = { light: 'file:icons/Malcore.svg', dark: 'file:icons/Malcore.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		}
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			apiKey: credentials.apiKey,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.malcore.io/api',
			url: '/urlcheck',
			method: 'POST',
			body: {"url":"google.com"}
		},
	};
}
