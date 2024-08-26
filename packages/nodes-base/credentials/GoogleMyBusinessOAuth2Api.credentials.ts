import {
	type IAuthenticateGeneric,
	type ICredentialTestRequest,
	type ICredentialType,
	type IHttpRequestMethods,
	type INodeProperties,
} from 'n8n-workflow';

const scopes = ['https://www.googleapis.com/auth/business.manage'];

export class GoogleMyBusinessOAuth2Api implements ICredentialType {
	name = 'googleMyBusinessOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google My Business OAuth2 API';

	documentationUrl = 'google/oauth-single-service';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];

	// This allows the credential to be used by other parts of n8n
	// stating how this credential is injected as part of the request
	// An example is the Http Request node that can make generic calls
	// reusing this credential
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: 'Bearer {{$credentials.accessToken}}',
			},
		},
	};

	// The test block is used to test the credential
	// It uses a deprecated method to avoid the need of account and a location input
	// ToDo: Test the test function
	test: ICredentialTestRequest = {
		request: {
			method: 'GET' as IHttpRequestMethods,
			url: 'https://mybusiness.googleapis.com/v4/categories',
			headers: {
				Authorization: 'Bearer {{$credentials.accessToken}}',
			},
			qs: {
				pageSize: 1,
			},
			json: true,
		},
	};
}
