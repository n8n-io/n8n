import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { MicrosoftOutlookOAuth2Api } from '../MicrosoftOutlookOAuth2Api.credentials';

describe('MicrosoftOutlookOAuth2Api Credential', () => {
	const microsoftOutlookOAuth2Api = new MicrosoftOutlookOAuth2Api();
	const defaultScopes = [
		'openid',
		'offline_access',
		'Contacts.Read',
		'Contacts.ReadWrite',
		'Calendars.Read',
		'Calendars.Read.Shared',
		'Calendars.ReadWrite',
		'Mail.ReadWrite',
		'Mail.ReadWrite.Shared',
		'Mail.Send',
		'Mail.Send.Shared',
		'MailboxSettings.Read',
	];

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
		expect(microsoftOutlookOAuth2Api.name).toBe('microsoftOutlookOAuth2Api');
		expect(microsoftOutlookOAuth2Api.extends).toEqual(['microsoftOAuth2Api']);

		const enabledScopesProperty = microsoftOutlookOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.default).toBe(defaultScopes.join(' '));
	});

	it('should expose a customScopes toggle defaulting to false', () => {
		const customScopesProperty = microsoftOutlookOAuth2Api.properties.find(
			(p) => p.name === 'customScopes',
		);
		expect(customScopesProperty?.type).toBe('boolean');
		expect(customScopesProperty?.default).toBe(false);
	});

	it('should keep the scope property hidden and expression-driven', () => {
		const scopeProperty = microsoftOutlookOAuth2Api.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toBe(
			`={{$self["customScopes"] ? $self["enabledScopes"] : "${defaultScopes.join(' ')}"}}`,
		);
	});

	it('should only show enabledScopes when customScopes is true', () => {
		const enabledScopesProperty = microsoftOutlookOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.displayOptions?.show?.customScopes).toEqual([true]);
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			for (const scope of defaultScopes) {
				expect(authUri).toContain(encodeURIComponent(scope).replace(/%20/g, '+'));
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
		const customScopes = [...defaultScopes, 'User.Read', 'Tasks.ReadWrite'];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('User.Read');
			expect(authUri).toContain('Tasks.ReadWrite');
			expect(authUri).toContain('Mail.ReadWrite');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('User.Read');
			expect(token.data.scope).toContain('Tasks.ReadWrite');
			expect(token.data.scope).toContain('Mail.ReadWrite');
		});

		it('should handle a minimal scope set that drops defaults', async () => {
			const minimalScopes = ['openid', 'offline_access', 'User.Read'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, minimalScopes);

			const oauthClient = createOAuthClient(minimalScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('User.Read');
			expect(authUri).not.toContain('Mail.ReadWrite');
			expect(authUri).not.toContain('Calendars.ReadWrite');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('User.Read');
			expect(token.data.scope).not.toContain('Mail.ReadWrite');
			expect(token.data.scope).not.toContain('Calendars.ReadWrite');
		});
	});
});
