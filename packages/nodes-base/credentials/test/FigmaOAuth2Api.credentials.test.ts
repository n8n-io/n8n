import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { FigmaOAuth2Api } from '../FigmaOAuth2Api.credentials';

describe('FigmaOAuth2Api Credential', () => {
	const figmaOAuth2Api = new FigmaOAuth2Api();
	const defaultScopes = ['webhooks:read', 'webhooks:write'];

	const baseUrl = 'https://api.figma.com';
	const authorizationUri = 'https://www.figma.com/oauth';
	const accessTokenUri = `${baseUrl}/v1/oauth/token`;
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
			.post('/v1/oauth/token', (body: Record<string, unknown>) => {
				return (
					body.code === code &&
					body.grant_type === 'authorization_code' &&
					body.redirect_uri === redirectUri
				);
			})
			.reply(200, {
				access_token: 'test-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'test-refresh-token',
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
		expect(figmaOAuth2Api.name).toBe('figmaOAuth2Api');
		expect(figmaOAuth2Api.extends).toEqual(['oAuth2Api']);

		const authUrlProperty = figmaOAuth2Api.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://www.figma.com/oauth');

		const tokenUrlProperty = figmaOAuth2Api.properties.find((p) => p.name === 'accessTokenUrl');
		expect(tokenUrlProperty?.default).toBe('https://api.figma.com/v1/oauth/token');

		const enabledScopesProperty = figmaOAuth2Api.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe('webhooks:read webhooks:write');
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('webhooks');
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('webhooks:read');
			expect(token.data.scope).toContain('webhooks:write');
			expect(token.data.refresh_token).toBe('test-refresh-token');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [
			'webhooks:read',
			'webhooks:write',
			'file_content:read',
			'file_comments:write',
		];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('file_content');
			expect(authUri).toContain('file_comments');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('webhooks:read');
			expect(token.data.scope).toContain('webhooks:write');
			expect(token.data.scope).toContain('file_content:read');
			expect(token.data.scope).toContain('file_comments:write');
		});

		it('should handle a minimal scope set distinct from defaults', async () => {
			const minimalScopes = ['webhooks:read'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, minimalScopes);

			const oauthClient = createOAuthClient(minimalScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('webhooks');
			expect(authUri).not.toContain('webhooks%3Awrite');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('webhooks:read');
			expect(token.data.scope).not.toContain('webhooks:write');
		});
	});
});
