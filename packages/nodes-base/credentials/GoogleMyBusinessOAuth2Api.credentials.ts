import {
	ApplicationError,
	type IAuthenticateGeneric,
	type ICredentialType,
	type IDataObject,
	type IHttpRequestHelper,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
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

	// ToDo: Test the authentication
	// This function runs before the authentication happens
	preAuthentication = async function (
		this: IHttpRequestHelper,
		credentials: IDataObject,
	): Promise<IDataObject> {
		// Perform the OAuth2 flow to obtain an access token
		const tokenRequestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: 'https://oauth2.googleapis.com/token',
			body: {
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
				grant_type: 'authorization_code',
				code: credentials.code,
				redirect_uri: credentials.redirectUri,
			},
			json: true,
		};

		try {
			// Send the request to get the access token
			const response: IDataObject = (await this.helpers?.httpRequest(
				tokenRequestOptions,
			)) as IDataObject;

			// Return the acquired tokens and other necessary data
			return {
				...credentials,
				accessToken: response.access_token,
				refreshToken: response.refresh_token,
				expiresIn: response.expires_in,
			};
		} catch (error) {
			// Handle any errors that occur during the request
			throw new ApplicationError(`Failed to obtain access token: ${(error as Error).message}`);
		}
	};

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
	test = {
		request: {
			method: 'GET' as IHttpRequestMethods,
			url: 'https://mybusiness.googleapis.com/v4/categories',
			headers: {
				Authorization: 'Bearer {{$credentials.accessToken}}',
			},
			qs: {
				pageSize: 1, // Test with a small page size to minimize data returned
			},
			json: true,
		} as IHttpRequestOptions,
	};
}
