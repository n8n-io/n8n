import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class LinearClientCredentialsOAuth2Api implements ICredentialType {
	name = 'linearClientCredentialsOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Linear Client Credentials OAuth2 API';

	documentationUrl = 'linear';

	properties: INodeProperties[] = [
		{
			displayName:
				'Client credentials tokens must be enabled on your OAuth2 app in Linear, and act as the application (not a user). Linear does not support them for webhooks, so they cannot be used with the Linear Trigger.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'clientCredentials',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.linear.app/oauth/token',
			required: true,
		},
		{
			// Linear expects a comma-separated scope list. The core OAuth2 client splits
			// `scope` on spaces and rejoins with a space, so the commas survive as a single
			// token and reach Linear in the documented format.
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'read,write,issues:create,comments:create',
			required: true,
		},
		{
			// Basic auth, so the client credentials never appear in the request body. Also
			// keeps the base type's `additionalBodyProperties` fields hidden, as they only
			// apply to body authentication.
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];

	// Without this, the generic OAuth2 test reports "not connected to an account", since a
	// client credentials token is only fetched on first use.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.linear.app',
			url: '/graphql',
			method: 'POST',
			body: {
				query: '{ issues(first: 1) { nodes { id } } }',
			},
		},
	};
}
