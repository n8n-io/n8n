import {
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
		const url = requestOptions.url ? requestOptions.url : requestOptions.uri;
		if (url.includes('https://api.mindee.net/v1/')) {
			requestOptions.headers!.Authorization = `Token ${credentials.apiKey}`;
		} else {
			requestOptions.headers!['X-Inferuser-Token'] = `${credentials.apiKey}`;
		}
		return requestOptions;
	}
}
