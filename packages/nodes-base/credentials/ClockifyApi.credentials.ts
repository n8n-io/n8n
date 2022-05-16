import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';


export class ClockifyApi implements ICredentialType {
	name = 'clockifyApi';
	displayName = 'Clockify API';
	documentationUrl = 'clockify';
	properties: INodeProperties[] = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		const data = Buffer.from(`${credentials!.email}:${credentials!.password || credentials!.apiToken}`).toString('base64');
		if(requestOptions.headers) {
		requestOptions.headers!['X-Api-Key'] = credentials.apiKey;
		} else {
			requestOptions.headers = {
				'X-Api-Key': credentials.apiKey,
			};
		}
		return requestOptions;
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.clockify.me/api/v1',
			url: '/user',
		},
	};
}
