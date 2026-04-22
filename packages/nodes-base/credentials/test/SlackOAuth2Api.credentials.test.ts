import { SlackOAuth2Api, userScopes } from '../SlackOAuth2Api.credentials';

describe('SlackOAuth2Api Credential', () => {
	const credential = new SlackOAuth2Api();

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('slackOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);

		const authUrlProperty = credential.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://slack.com/oauth/v2/authorize');

		const accessTokenUrlProperty = credential.properties.find((p) => p.name === 'accessTokenUrl');
		expect(accessTokenUrlProperty?.default).toBe('https://slack.com/api/oauth.v2.access');
	});

	it('should not have a hardcoded bot scope field', () => {
		const scopeProperty = credential.properties.find(
			(p) => p.name === 'scope' && p.default === 'chat:write',
		);
		expect(scopeProperty).toBeUndefined();
	});

	it('should have custom scopes toggle defaulting to false', () => {
		const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
		expect(customScopesProperty?.default).toBe(false);
	});

	it('should have userScope defaulting to the full default scope list', () => {
		const userScopeProperty = credential.properties.find((p) => p.name === 'userScope');
		expect(userScopeProperty?.default).toBe(userScopes.join(' '));
	});

	it('should use userScope in authQueryParameters when customScopes is true, otherwise use defaults', () => {
		const authQueryParamsProperty = credential.properties.find(
			(p) => p.name === 'authQueryParameters',
		);
		expect(authQueryParamsProperty?.default).toBe(
			`={{$self["customScopes"] ? "user_scope=" + $self["userScope"] : "user_scope=${userScopes.join(' ')}"}}`,
		);
	});
});
