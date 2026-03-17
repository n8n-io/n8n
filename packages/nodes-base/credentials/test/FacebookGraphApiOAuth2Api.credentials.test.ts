import { FacebookGraphApiOAuth2Api } from '../FacebookGraphApiOAuth2Api.credentials';

describe('FacebookGraphApiOAuth2Api Credential', () => {
	const credential = new FacebookGraphApiOAuth2Api();
	const defaultScopes = [
		'public_profile',
		'email',
		'pages_show_list',
		'pages_read_engagement',
		'pages_read_user_content',
		'pages_manage_metadata',
		'pages_manage_posts',
		'business_management',
	];

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('facebookGraphApiOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
	});

	it('should use the correct OAuth2 endpoints', () => {
		const authUrlProp = credential.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProp?.default).toBe('https://www.facebook.com/v19.0/dialog/oauth');

		const tokenUrlProp = credential.properties.find((p) => p.name === 'accessTokenUrl');
		expect(tokenUrlProp?.default).toBe('https://graph.facebook.com/v19.0/oauth/access_token');
	});

	it('should have custom scopes toggle defaulting to false', () => {
		const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
		expect(customScopesProperty?.default).toBe(false);
	});

	it('should embed all default scopes in the scope expression', () => {
		const enabledScopesProp = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProp?.default).toBe(defaultScopes.join(' '));

		const scopeProp = credential.properties.find((p) => p.name === 'scope');
		for (const scope of defaultScopes) {
			expect(scopeProp?.default).toContain(scope);
		}
	});

	it('should drive scope from enabledScopes when customScopes is true', () => {
		const scopeProp = credential.properties.find((p) => p.name === 'scope');
		// The scope expression references $self["customScopes"] and $self["enabledScopes"]
		expect(scopeProp?.default).toContain('$self["customScopes"]');
		expect(scopeProp?.default).toContain('$self["enabledScopes"]');
	});
});
