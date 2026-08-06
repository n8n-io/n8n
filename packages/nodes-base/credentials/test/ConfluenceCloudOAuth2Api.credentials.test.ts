import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { ConfluenceCloudOAuth2Api } from '../ConfluenceCloudOAuth2Api.credentials';

describe('ConfluenceCloudOAuth2Api Credential', () => {
	const confluenceOAuth2Api = new ConfluenceCloudOAuth2Api();
	const defaultScopes = [
		'read:page:confluence',
		'write:page:confluence',
		'read:hierarchical-content:confluence',
		'read:space:confluence',
		'read:attachment:confluence',
		'read:comment:confluence',
		'read:label:confluence',
		'read:content-details:confluence',
		'write:attachment:confluence',
		'delete:attachment:confluence',
		'write:comment:confluence',
		'delete:comment:confluence',
		'write:label:confluence',
		'delete:page:confluence',
		'offline_access',
	];

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
		expect(confluenceOAuth2Api.name).toBe('confluenceCloudOAuth2Api');
		expect(confluenceOAuth2Api.extends).toEqual(['atlassianOAuth2Api']);

		const enabledScopesProperty = confluenceOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.default).toBe(defaultScopes.join(' '));

		const scopeProperty = confluenceOAuth2Api.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toContain(defaultScopes.join(' '));
	});

	it('should inherit the Site URL field from atlassianOAuth2Api', () => {
		// The field lives on the base (asserted in AtlassianOAuth2Api.credentials.test.ts);
		// the credential must not shadow it with its own definition
		expect(confluenceOAuth2Api.properties.find((p) => p.name === 'domain')).toBeUndefined();
		expect(confluenceOAuth2Api.properties.find((p) => p.name === 'siteUrl')).toBeUndefined();
	});

	it('should test the connection against accessible-resources', () => {
		expect(confluenceOAuth2Api.test).toEqual({
			request: {
				baseURL: 'https://api.atlassian.com',
				url: '/oauth/token/accessible-resources',
				method: 'GET',
			},
		});
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('read%3Apage%3Aconfluence');
			expect(authUri).toContain('write%3Apage%3Aconfluence');
			expect(authUri).toContain('read%3Aspace%3Aconfluence');
			expect(authUri).toContain('read%3Aattachment%3Aconfluence');
			expect(authUri).toContain('read%3Acomment%3Aconfluence');
			expect(authUri).toContain('read%3Alabel%3Aconfluence');
			expect(authUri).toContain('read%3Acontent-details%3Aconfluence');
			expect(authUri).toContain('offline_access');
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('read:page:confluence');
			expect(token.data.scope).toContain('write:page:confluence');
			expect(token.data.scope).toContain('read:content-details:confluence');
			expect(token.data.scope).toContain('offline_access');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [
			'read:page:confluence',
			'write:page:confluence',
			'write:space:confluence',
			'write:attachment:confluence',
			'offline_access',
		];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('write%3Aspace%3Aconfluence');
			expect(authUri).toContain('write%3Aattachment%3Aconfluence');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('write:space:confluence');
			expect(token.data.scope).toContain('write:attachment:confluence');
		});

		it('should handle minimal custom scopes', async () => {
			const minimalScopes = ['read:page:confluence', 'offline_access'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, minimalScopes);

			const oauthClient = createOAuthClient(minimalScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('read%3Apage%3Aconfluence');
			expect(authUri).toContain('offline_access');
			expect(authUri).not.toContain('write%3Apage%3Aconfluence');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('read:page:confluence');
			expect(token.data.scope).not.toContain('write:page:confluence');
		});
	});
});
