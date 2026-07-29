import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { JiraSoftwareCloudOAuth2Api } from '../JiraSoftwareCloudOAuth2Api.credentials';

describe('JiraSoftwareCloudOAuth2Api Credential', () => {
	const jiraOAuth2Api = new JiraSoftwareCloudOAuth2Api();
	const defaultScopes = [
		'read:jira-user',
		'read:jira-work',
		'write:jira-work',
		'manage:jira-webhook',
		'manage:jira-user',
		'offline_access',
	];

	// Shared OAuth2 configuration
	const baseUrl = 'https://auth.atlassian.com';
	const authorizationUri = `${baseUrl}/authorize`;
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
		expect(jiraOAuth2Api.name).toBe('jiraSoftwareCloudOAuth2Api');
		expect(jiraOAuth2Api.extends).toEqual(['oAuth2Api']);

		const enabledScopesProperty = jiraOAuth2Api.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe(
			'read:jira-user read:jira-work write:jira-work manage:jira-webhook manage:jira-user offline_access',
		);

		// Verify Atlassian-specific OAuth2 endpoints
		const authUrlProperty = jiraOAuth2Api.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://auth.atlassian.com/authorize');

		const accessTokenUrlProperty = jiraOAuth2Api.properties.find(
			(p) => p.name === 'accessTokenUrl',
		);
		expect(accessTokenUrlProperty?.default).toBe('https://auth.atlassian.com/oauth/token');

		// Verify audience parameter is set (required for Atlassian OAuth2)
		const authQueryParamsProperty = jiraOAuth2Api.properties.find(
			(p) => p.name === 'authQueryParameters',
		);
		expect(authQueryParamsProperty?.default).toBe('audience=api.atlassian.com&prompt=consent');
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('read%3Ajira-user');
			expect(authUri).toContain('read%3Ajira-work');
			expect(authUri).toContain('write%3Ajira-work');
			expect(authUri).toContain('manage%3Ajira-webhook');
			expect(authUri).toContain('manage%3Ajira-user');
			expect(authUri).toContain('offline_access');
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('read:jira-user');
			expect(token.data.scope).toContain('read:jira-work');
			expect(token.data.scope).toContain('write:jira-work');
			expect(token.data.scope).toContain('manage:jira-webhook');
			expect(token.data.scope).toContain('manage:jira-user');
			expect(token.data.scope).toContain('offline_access');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [
			'read:jira-user',
			'read:jira-work',
			'write:jira-work',
			'offline_access',
			'manage:jira-project',
			'manage:jira-configuration',
		];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('manage%3Ajira-project');
			expect(authUri).toContain('manage%3Ajira-configuration');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('read:jira-user');
			expect(token.data.scope).toContain('manage:jira-project');
			expect(token.data.scope).toContain('manage:jira-configuration');
		});

		it('should handle minimal custom scopes', async () => {
			const minimalScopes = ['read:jira-work', 'offline_access'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, minimalScopes);

			const oauthClient = createOAuthClient(minimalScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('read%3Ajira-work');
			expect(authUri).toContain('offline_access');
			expect(authUri).not.toContain('write%3Ajira-work');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('read:jira-work');
			expect(token.data.scope).not.toContain('write:jira-work');
		});
	});
});
