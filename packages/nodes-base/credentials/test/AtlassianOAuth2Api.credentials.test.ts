import { AtlassianOAuth2Api } from '../AtlassianOAuth2Api.credentials';

describe('AtlassianOAuth2Api Credential', () => {
	const atlassianOAuth2Api = new AtlassianOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(atlassianOAuth2Api.name).toBe('atlassianOAuth2Api');
		expect(atlassianOAuth2Api.extends).toEqual(['oAuth2Api']);

		const domainProperty = atlassianOAuth2Api.properties.find((p) => p.name === 'domain');
		expect(domainProperty?.displayName).toBe('Site URL');
		expect(domainProperty?.required).toBe(true);
		expect(domainProperty?.placeholder).toBe('https://your-site.atlassian.net');

		const authUrlProperty = atlassianOAuth2Api.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://auth.atlassian.com/authorize');

		const accessTokenUrlProperty = atlassianOAuth2Api.properties.find(
			(p) => p.name === 'accessTokenUrl',
		);
		expect(accessTokenUrlProperty?.default).toBe('https://auth.atlassian.com/oauth/token');

		const authQueryParamsProperty = atlassianOAuth2Api.properties.find(
			(p) => p.name === 'authQueryParameters',
		);
		expect(authQueryParamsProperty?.default).toBe('audience=api.atlassian.com&prompt=consent');

		const authenticationProperty = atlassianOAuth2Api.properties.find(
			(p) => p.name === 'authentication',
		);
		expect(authenticationProperty?.default).toBe('header');

		const grantTypeProperty = atlassianOAuth2Api.properties.find((p) => p.name === 'grantType');
		expect(grantTypeProperty?.default).toBe('authorizationCode');
	});

	it('should expose the scope machinery for extending credentials', () => {
		const customScopesProperty = atlassianOAuth2Api.properties.find(
			(p) => p.name === 'customScopes',
		);
		expect(customScopesProperty?.type).toBe('boolean');
		expect(customScopesProperty?.default).toBe(false);

		const enabledScopesProperty = atlassianOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.displayOptions).toEqual({ show: { customScopes: [true] } });

		const enabledScopes = enabledScopesProperty?.default as string;
		expect(enabledScopes).toContain('read:jira-work');
		expect(enabledScopes).toContain('manage:jira-project');
		expect(enabledScopes).toContain('read:page:confluence');
		expect(enabledScopes).toContain('write:page:confluence');
		expect(enabledScopes).toContain('offline_access');

		const scopeProperty = atlassianOAuth2Api.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toContain('$self["customScopes"]');
	});

	it('should test the connection against accessible-resources', () => {
		expect(atlassianOAuth2Api.test).toEqual({
			request: {
				baseURL: 'https://api.atlassian.com',
				url: '/oauth/token/accessible-resources',
				method: 'GET',
			},
		});
	});
});
