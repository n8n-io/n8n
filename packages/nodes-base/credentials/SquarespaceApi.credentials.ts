import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SquarespaceApi implements ICredentialType {
	name = 'squarespaceApi';
	displayName = 'Squarespace API';
	documentationUrl = 'squarespace';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: 'https://api.squarespace.com/1.0/commerce/store_pages',
			method: 'GET',
		},
	};
}
