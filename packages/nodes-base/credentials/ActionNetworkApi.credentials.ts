import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class ActionNetworkApi implements ICredentialType {
	name = 'actionNetworkApi';
	displayName = 'Action Network API';
	documentationUrl = 'actionNetwork';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://actionnetwork.org/api/v2',
			url: '/events?per_page=1',
		},
	};
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = { 'OSDI-API-Token': credentials.apiKey };
		return requestOptions;
	}
}
