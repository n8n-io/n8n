import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { defaultScopes, GumroadOAuth2Api } from '../GumroadOAuth2Api.credentials';

describe('GumroadOAuth2Api Credential', () => {
	const credential = new GumroadOAuth2Api();

	const baseUrl = 'https://gumroad.com';
	const authorizationUri = `${baseUrl}/oauth/authorize`;
	const accessTokenUri = `${baseUrl}/oauth/token`;
	const redirectUri = 'http://localhost:5678/rest/oauth2-credential/callback';
	const clientId = 'test-client-id';
	const clientSecret = 'test-client-secret';

	const createOAuthClient = (scopes: string[]) =>
		new ClientOAuth2({
			clientId,
			clientSecret,
			accessTokenUri,
			authorizationUri,
			redirectUri,
			scopes,
		});

	const mockTokenEndpoint = (code: string, responseScopes: string[]) => {
		nock(baseUrl)
			.post('/oauth/token', (body: Record<string, unknown>) => {
				return (
					body.code === code &&
					body.grant_type === 'authorization_code' &&
					body.redirect_uri === redirectUri
				);
			})
			.reply(200, {
				access_token: 'test-access-token',
				token_type: 'Bearer',
				scope: responseScopes.join(' '),
			});
	};

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	it('should have correct credential metadata', () => {
		expect(credential.name).toBe('gumroadOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);
		expect(credential.displayName).toBe('Gumroad OAuth2 API');
		expect(credential.documentationUrl).toBe('gumroad');

		const authUrlProperty = credential.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://gumroad.com/oauth/authorize');

		const accessTokenUrlProperty = credential.properties.find((p) => p.name === 'accessTokenUrl');
		expect(accessTokenUrlProperty?.default).toBe('https://gumroad.com/oauth/token');

		const authenticationProperty = credential.properties.find((p) => p.name === 'authentication');
		expect(authenticationProperty?.default).toBe('body');
	});

	it('should have custom scopes toggle defaulting to false', () => {
		const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
		expect(customScopesProperty?.default).toBe(false);
	});

	it('should default enabledScopes to the default scope list', () => {
		const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe(defaultScopes.join(' '));
	});

	it('should toggle scope between custom and default values', () => {
		const scopeProperty = credential.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.default).toBe(
			`={{$self["customScopes"] ? $self["enabledScopes"] : "${defaultScopes.join(' ')}"}}`,
		);
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			for (const scope of defaultScopes) {
				expect(authUri).toContain(scope);
			}
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			for (const scope of defaultScopes) {
				expect(token.data.scope).toContain(scope);
			}
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = ['view_sales', 'view_profile', 'edit_products'];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('view_sales');
			expect(authUri).toContain('view_profile');
			expect(authUri).toContain('edit_products');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('view_sales');
			expect(token.data.scope).toContain('view_profile');
			expect(token.data.scope).toContain('edit_products');
		});

		it('should not include scopes that are not in the configured set', async () => {
			const minimalScopes = ['view_sales'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, minimalScopes);

			const oauthClient = createOAuthClient(minimalScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('view_sales');
			expect(authUri).not.toContain('edit_products');
			expect(authUri).not.toContain('view_profile');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);
			expect(token.data.scope).toContain('view_sales');
			expect(token.data.scope).not.toContain('edit_products');
			expect(token.data.scope).not.toContain('view_profile');
		});
	});
});
