import { LinearClientCredentialsOAuth2Api } from '../LinearClientCredentialsOAuth2Api.credentials';

describe('LinearClientCredentialsOAuth2Api Credential', () => {
	const credential = new LinearClientCredentialsOAuth2Api();

	const getProperty = (name: string) => credential.properties.find((p) => p.name === name);

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('linearClientCredentialsOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
		expect(credential.displayName).toBe('Linear Client Credentials OAuth2 API');
	});

	it('should use the client credentials grant against Linear token endpoint', () => {
		expect(getProperty('grantType')?.default).toBe('clientCredentials');
		expect(getProperty('accessTokenUrl')?.default).toBe('https://api.linear.app/oauth/token');
	});

	// Linear's token endpoint documents a comma-separated scope list. The core OAuth2
	// client splits `scope` on spaces, so commas must not be replaced with spaces.
	it('should request a comma-separated scope list', () => {
		const scope = getProperty('scope');
		expect(scope?.default).toBe('read,write,issues:create,comments:create');
		expect(scope?.default).not.toContain(' ');
	});

	// `admin` would revoke every other app actor token for the app when scopes change,
	// and is not needed since webhooks are unsupported for client credentials tokens.
	it('should not request the admin scope', () => {
		expect(getProperty('scope')?.default).not.toContain('admin');
	});

	it('should send the client credentials as a basic auth header', () => {
		expect(getProperty('authentication')?.default).toBe('header');
	});

	// Leaving `tokenExpiredStatusCode` undeclared keeps the core token refresh pinned to
	// 401, which is what Linear returns for an expired client credentials token.
	it('should not override the token expired status code', () => {
		expect(getProperty('tokenExpiredStatusCode')).toBeUndefined();
	});

	// Without a test request the generic OAuth2 credential test reports "not connected
	// to an account", because the token is only fetched on first use.
	it('should define a test request against the GraphQL API', () => {
		expect(credential.test.request).toMatchObject({
			baseURL: 'https://api.linear.app',
			url: '/graphql',
			method: 'POST',
		});
	});

	it('should not ask for a signing secret, as webhooks are unsupported', () => {
		expect(getProperty('signingSecret')).toBeUndefined();
	});
});
