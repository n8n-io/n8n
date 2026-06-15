import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { MicrosoftTeamsOAuth2Api } from '../MicrosoftTeamsOAuth2Api.credentials';

describe('MicrosoftTeamsOAuth2Api Credential', () => {
	const microsoftTeamsOAuth2Api = new MicrosoftTeamsOAuth2Api();
	const defaultScopes = [
		'openid',
		'offline_access',
		'User.Read.All',
		'Group.ReadWrite.All',
		'Chat.ReadWrite',
		'ChannelMessage.Read.All',
	];

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
		expect(microsoftTeamsOAuth2Api.name).toBe('microsoftTeamsOAuth2Api');
		expect(microsoftTeamsOAuth2Api.extends).toEqual(['microsoftOAuth2Api']);

		// Verify default scopes are correctly defined
		const enabledScopesProperty = microsoftTeamsOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.default).toBe(
			'openid offline_access User.Read.All Group.ReadWrite.All Chat.ReadWrite ChannelMessage.Read.All',
		);
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			// Verify the authorization URI contains the correct scopes
			expect(authUri).toContain('scope=');
			expect(authUri).toContain('openid');
			expect(authUri).toContain('offline_access');
			expect(authUri).toContain('User.Read.All');
			expect(authUri).toContain('Group.ReadWrite.All');
			expect(authUri).toContain('Chat.ReadWrite');
			expect(authUri).toContain('ChannelMessage.Read.All');
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('openid');
			expect(token.data.scope).toContain('offline_access');
			expect(token.data.scope).toContain('User.Read.All');
			expect(token.data.scope).toContain('Group.ReadWrite.All');
			expect(token.data.scope).toContain('Chat.ReadWrite');
			expect(token.data.scope).toContain('ChannelMessage.Read.All');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [
			'openid',
			'offline_access',
			'User.Read.All',
			'Group.ReadWrite.All',
			'Chat.ReadWrite',
			'ChannelMessage.Read.All',
			'Chat.Read.All',
			'Team.ReadBasic.All',
			'Subscription.ReadWrite.All',
		];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('openid');
			expect(authUri).toContain('Chat.Read.All');
			expect(authUri).toContain('Team.ReadBasic.All');
			expect(authUri).toContain('Subscription.ReadWrite.All');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('openid');
			expect(token.data.scope).toContain('offline_access');
			expect(token.data.scope).toContain('User.Read.All');
			expect(token.data.scope).toContain('Chat.Read.All');
			expect(token.data.scope).toContain('Team.ReadBasic.All');
			expect(token.data.scope).toContain('Subscription.ReadWrite.All');
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
			expect(authUri).not.toContain('Chat.ReadWrite');
			expect(authUri).not.toContain('ChannelMessage.Read.All');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			// Verify token response has the different scopes
			expect(token.data.scope).toContain('Calendars.Read');
			expect(token.data.scope).toContain('Mail.Send');
			expect(token.data.scope).not.toContain('Chat.ReadWrite');
			expect(token.data.scope).not.toContain('ChannelMessage.Read.All');
		});
	});
});
