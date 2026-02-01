import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { MicrosoftExcelOAuth2Api } from '../MicrosoftExcelOAuth2Api.credentials';

describe('MicrosoftExcelOAuth2Api Credential', () => {
	const microsoftExcelOAuth2Api = new MicrosoftExcelOAuth2Api();
	const defaultScopes = ['openid', 'offline_access', 'Files.ReadWrite'];

	// Shared OAuth2 configuration
	const baseUrl = 'https://login.microsoftonline.com';
	const authorizationUri = `${baseUrl}/common/oauth2/v2.0/authorize`;
	const accessTokenUri = `${baseUrl}/common/oauth2/v2.0/token`;
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
			.post('/common/oauth2/v2.0/token', (body: Record<string, unknown>) => {
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
		expect(microsoftExcelOAuth2Api.name).toBe('microsoftExcelOAuth2Api');
		expect(microsoftExcelOAuth2Api.extends).toEqual(['microsoftOAuth2Api']);

		// Verify default scopes are correctly defined
		const enabledScopesProperty = microsoftExcelOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.default).toBe('openid offline_access Files.ReadWrite');
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			// Verify the authorization URI contains the correct scopes
			// Scopes can be encoded with either %20 or + for spaces
			expect(authUri).toMatch(/scope=(openid[+%20]offline_access[+%20]Files\.ReadWrite)/);
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toBe('openid offline_access Files.ReadWrite');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [
			'openid',
			'offline_access',
			'Files.ReadWrite',
			'Files.Read.All',
			'Sites.ReadWrite.All',
		];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('openid');
			expect(authUri).toContain('Files.Read.All');
			expect(authUri).toContain('Sites.ReadWrite.All');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('openid');
			expect(token.data.scope).toContain('offline_access');
			expect(token.data.scope).toContain('Files.ReadWrite');
			expect(token.data.scope).toContain('Files.Read.All');
			expect(token.data.scope).toContain('Sites.ReadWrite.All');
		});

		it('should handle completely different custom scopes', async () => {
			const differentScopes = ['User.Read', 'Mail.Read', 'Calendar.ReadWrite'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, differentScopes);

			const oauthClient = createOAuthClient(differentScopes);
			const authUri = oauthClient.code.getUri();

			// Verify authorization URI has the different scopes
			expect(authUri).toContain('User.Read');
			expect(authUri).toContain('Mail.Read');
			expect(authUri).toContain('Calendar.ReadWrite');
			expect(authUri).not.toContain('Files.ReadWrite');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			// Verify token response has the different scopes
			expect(token.data.scope).toContain('User.Read');
			expect(token.data.scope).toContain('Mail.Read');
			expect(token.data.scope).toContain('Calendar.ReadWrite');
			expect(token.data.scope).not.toContain('Files.ReadWrite');
		});
	});
});
