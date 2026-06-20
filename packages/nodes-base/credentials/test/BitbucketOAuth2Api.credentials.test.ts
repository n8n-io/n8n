import { BitbucketOAuth2Api } from '../BitbucketOAuth2Api.credentials';

describe('BitbucketOAuth2Api Credential', () => {
	const credential = new BitbucketOAuth2Api();
	const defaultScopes = 'account repository repository:write pullrequest pullrequest:write webhook';

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('bitbucketOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);

		const authUrlProperty = credential.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://bitbucket.org/site/oauth2/authorize');

		const accessTokenUrlProperty = credential.properties.find((p) => p.name === 'accessTokenUrl');
		expect(accessTokenUrlProperty?.default).toBe('https://bitbucket.org/site/oauth2/access_token');
	});

	it('should use the authorization code grant', () => {
		const grantTypeProperty = credential.properties.find((p) => p.name === 'grantType');
		expect(grantTypeProperty?.type).toBe('hidden');
		expect(grantTypeProperty?.default).toBe('authorizationCode');
	});

	it('should use header authentication', () => {
		const authenticationProperty = credential.properties.find((p) => p.name === 'authentication');
		expect(authenticationProperty?.type).toBe('hidden');
		expect(authenticationProperty?.default).toBe('header');
	});

	it('should have custom scopes toggle defaulting to false', () => {
		const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
		expect(customScopesProperty?.type).toBe('boolean');
		expect(customScopesProperty?.default).toBe(false);
	});

	it('should have enabledScopes defaulting to the current default scope list', () => {
		const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe(defaultScopes);
	});

	it('should only show enabledScopes when customScopes is true', () => {
		const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.displayOptions?.show?.customScopes).toEqual([true]);
	});

	it('should use enabledScopes when customScopes is true, otherwise fall back to defaults', () => {
		const scopeProperty = credential.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toBe(
			`={{$self["customScopes"] ? $self["enabledScopes"] : "${defaultScopes}"}}`,
		);
	});
});
