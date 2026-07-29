import { WordpressOAuth2Api } from '../WordpressOAuth2Api.credentials';

describe('WordpressOAuth2Api Credential', () => {
	const credential = new WordpressOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('wordpressOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);

		const authUrlProperty = credential.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://public-api.wordpress.com/oauth2/authorize');

		const accessTokenUrlProperty = credential.properties.find((p) => p.name === 'accessTokenUrl');
		expect(accessTokenUrlProperty?.default).toBe('https://public-api.wordpress.com/oauth2/token');
	});

	it('should have a notice about WordPress.com-only support', () => {
		const noticeProperty = credential.properties.find((p) => p.name === 'wordpressComNotice');
		expect(noticeProperty).toBeDefined();
		expect(noticeProperty?.type).toBe('notice');
		expect(noticeProperty?.default).toBe('');
	});

	it('should have a required wordpressSite field with no default', () => {
		const siteProperty = credential.properties.find((p) => p.name === 'wordpressSite');
		expect(siteProperty).toBeDefined();
		expect(siteProperty?.type).toBe('string');
		expect(siteProperty?.required).toBe(true);
		expect(siteProperty?.default).toBe('');
	});

	it('should have custom scopes toggle defaulting to false', () => {
		const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
		expect(customScopesProperty?.default).toBe(false);
	});

	it('should have enabledScopes defaulting to "global"', () => {
		const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe('global');
	});

	it('should use enabledScopes when customScopes is true, otherwise fall back to "global"', () => {
		const scopeProperty = credential.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.default).toBe(
			'={{$self["customScopes"] ? $self["enabledScopes"] : "global"}}',
		);
	});
});
