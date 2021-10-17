import {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class AsanaApi implements ICredentialType {
	name = 'asanaApi';
	displayName = 'Asana API';
	documentationUrl = 'asana';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;
		return requestOptions;
	}
}
