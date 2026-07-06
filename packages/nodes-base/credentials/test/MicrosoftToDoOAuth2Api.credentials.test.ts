import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { MicrosoftToDoOAuth2Api } from '../MicrosoftToDoOAuth2Api.credentials';

describe('MicrosoftToDoOAuth2Api Credential', () => {
	const microsoftToDoOAuth2Api = new MicrosoftToDoOAuth2Api();
	const defaultScopes = ['openid', 'offline_access', 'Tasks.ReadWrite'];

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
		expect(microsoftToDoOAuth2Api.name).toBe('microsoftToDoOAuth2Api');
		expect(microsoftToDoOAuth2Api.extends).toEqual(['microsoftOAuth2Api']);

		// Verify default scopes are correctly defined
		const enabledScopesProperty = microsoftToDoOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.default).toBe('openid offline_access Tasks.ReadWrite');
	});

	it('should keep the scope hidden and default to the standard scopes when custom scopes are off', () => {
		const scopeProperty = microsoftToDoOAuth2Api.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toBe(
			'={{$self["customScopes"] ? $self["enabledScopes"] : "openid offline_access Tasks.ReadWrite"}}',
		);
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			// Verify the authorization URI contains the correct scopes
			// Scopes can be encoded with either %20 or + for spaces
			expect(authUri).toMatch(/scope=(openid[+%20]offline_access[+%20]Tasks\.ReadWrite)/);
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toBe('openid offline_access Tasks.ReadWrite');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [
			'openid',
			'offline_access',
			'Tasks.ReadWrite',
			'Tasks.ReadWrite.Shared',
			'User.Read',
		];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('openid');
			expect(authUri).toContain('Tasks.ReadWrite.Shared');
			expect(authUri).toContain('User.Read');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('openid');
			expect(token.data.scope).toContain('offline_access');
			expect(token.data.scope).toContain('Tasks.ReadWrite');
			expect(token.data.scope).toContain('Tasks.ReadWrite.Shared');
			expect(token.data.scope).toContain('User.Read');
		});

		it('should handle completely different custom scopes', async () => {
			const differentScopes = ['openid', 'offline_access', 'Calendars.Read', 'Mail.Send'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, differentScopes);

			const oauthClient = createOAuthClient(differentScopes);
			const authUri = oauthClient.code.getUri();

			// Verify authorization URI has the different scopes
			expect(authUri).toContain('Calendars.Read');
			expect(authUri).toContain('Mail.Send');
			expect(authUri).not.toContain('Tasks.ReadWrite');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			// Verify token response has the different scopes
			expect(token.data.scope).toContain('Calendars.Read');
			expect(token.data.scope).toContain('Mail.Send');
			expect(token.data.scope).not.toContain('Tasks.ReadWrite');
		});
	});
});
