import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class MindeeInvoiceApi implements ICredentialType {
	name = 'mindeeInvoiceApi';

	displayName = 'Mindee Invoice API';

	documentationUrl = 'mindee';

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
		// @ts-ignore
		const url = new URL(requestOptions.url ? requestOptions.url : requestOptions.uri);
		if (url.hostname === 'api.mindee.net' && url.pathname.startsWith('/v1/')) {
			requestOptions.headers!.Authorization = `Token ${credentials.apiKey}`;
		} else {
			requestOptions.headers!['X-Inferuser-Token'] = `${credentials.apiKey}`;
		}
		return requestOptions;
	}
}
