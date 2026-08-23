import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { SnowflakeOAuth2Api } from '../SnowflakeOAuth2Api.credentials';

describe('SnowflakeOAuth2Api Credential', () => {
	const snowflakeOAuth2Api = new SnowflakeOAuth2Api();
	const defaultScopes = ['refresh_token', 'session:role:SYSADMIN'];

	const account = 'xy12345.us-east-1';
	const baseUrl = `https://${account}.snowflakecomputing.com`;
	const authorizationUri = `${baseUrl}/oauth/authorize`;
	const accessTokenUri = `${baseUrl}/oauth/token-request`;
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
			.post('/oauth/token-request', (body: Record<string, unknown>) => {
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
		expect(snowflakeOAuth2Api.name).toBe('snowflakeOAuth2Api');
		expect(snowflakeOAuth2Api.extends).toEqual(['oAuth2Api']);

		const authUrlProperty = snowflakeOAuth2Api.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toContain('snowflakecomputing.com/oauth/authorize');

		const accessTokenUrlProperty = snowflakeOAuth2Api.properties.find(
			(p) => p.name === 'accessTokenUrl',
		);
		expect(accessTokenUrlProperty?.default).toContain('snowflakecomputing.com/oauth/token-request');

		const enabledScopesProperty = snowflakeOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.default).toBe('refresh_token session:role:SYSADMIN');
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('refresh_token');
			expect(authUri).toContain('session%3Arole%3ASYSADMIN');
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('refresh_token');
			expect(token.data.scope).toContain('session:role:SYSADMIN');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = ['session:role:ANALYST', 'session:role:SYSADMIN'];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('ANALYST');
			expect(authUri).toContain('SYSADMIN');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('session:role:ANALYST');
			expect(token.data.scope).toContain('session:role:SYSADMIN');
		});

		it('should handle a minimal scope set and exclude default scopes', async () => {
			const minimalScopes = ['session:role:READONLY'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, minimalScopes);

			const oauthClient = createOAuthClient(minimalScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('READONLY');
			expect(authUri).not.toContain('role%3Aall');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);
			expect(token.data.scope).toContain('session:role:READONLY');
			expect(token.data.scope).not.toContain('session:role:all');
		});
	});
});
