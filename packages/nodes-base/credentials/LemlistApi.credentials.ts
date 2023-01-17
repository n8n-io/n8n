import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class LemlistApi implements ICredentialType {
	name = 'lemlistApi';

	displayName = 'Lemlist API';

	documentationUrl = 'lemlist';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const encodedApiKey = Buffer.from(':' + (credentials.apiKey as string)).toString('base64');
		requestOptions.headers!.Authorization = `Basic ${encodedApiKey}`;
		requestOptions.headers!['user-agent'] = 'n8n';
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.lemlist.com/api',
			url: '/campaigns',
		},
	};
}
