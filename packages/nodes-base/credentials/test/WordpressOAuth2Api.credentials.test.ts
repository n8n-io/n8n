import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { WordpressOAuth2Api } from '../WordpressOAuth2Api.credentials';

describe('WordpressOAuth2Api Credential', () => {
	const credential = new WordpressOAuth2Api();

	// Shared OAuth2 configuration
	const authorizationUri = 'https://public-api.wordpress.com/oauth2/authorize';
	const accessTokenUri = 'https://public-api.wordpress.com/oauth2/token';
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
		nock('https://public-api.wordpress.com')
			.post('/oauth2/token', (body: Record<string, unknown>) => {
				return (
					body.code === code &&
					body.grant_type === 'authorization_code' &&
					body.redirect_uri === redirectUri
				);
			})
			.reply(200, {
				access_token: 'test-access-token',
				token_type: 'Bearer',
				expires_in: 64800,
				scope: responseScopes.join(' '),
				blog_id: '12345',
				blog_url: 'https://myblog.wordpress.com',
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

	it('should have custom domain toggle defaulting to false', () => {
		const customDomainProperty = credential.properties.find((p) => p.name === 'customDomain');
		expect(customDomainProperty?.default).toBe(false);
	});

	it('should have custom scopes toggle defaulting to false', () => {
		const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
		expect(customScopesProperty?.default).toBe(false);
	});

	it('should have default scope of global', () => {
		const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe('global');
	});

	describe('OAuth2 flow with default scope', () => {
		it('should include global scope in authorization URI', () => {
			const oauthClient = createOAuthClient(['global']);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('global');
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with global scope', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, ['global']);

			const oauthClient = createOAuthClient(['global']);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('global');
			expect(token.data.blog_id).toBe('12345');
			expect(token.data.blog_url).toBe('https://myblog.wordpress.com');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = ['posts', 'media'];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('posts');
			expect(authUri).toContain('media');
			expect(authUri).not.toContain('global');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('posts');
			expect(token.data.scope).toContain('media');
		});

		it('should handle completely different custom scopes', async () => {
			const differentScopes = ['comments', 'stats'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, differentScopes);

			const oauthClient = createOAuthClient(differentScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('comments');
			expect(authUri).toContain('stats');
			expect(authUri).not.toContain('global');
			expect(authUri).not.toContain('posts');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('comments');
			expect(token.data.scope).toContain('stats');
			expect(token.data.scope).not.toContain('global');
			expect(token.data.scope).not.toContain('posts');
		});
	});
});
