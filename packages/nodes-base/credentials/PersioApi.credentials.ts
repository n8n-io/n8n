import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class PersioApi implements ICredentialType {
	name = 'persioApi';

	displayName = 'Persio API';

	documentationUrl = 'Persio';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apikey',
			type: 'string',
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers!.Authorization = `Bearer ${credentials.apikey}`;
		return requestOptions;
	}
}
