import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';


export class AirtableApi implements ICredentialType {
	name = 'airtableApi';
	displayName = 'Airtable API';
	documentationUrl = 'airtable';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;
		return requestOptions;
	}
}
