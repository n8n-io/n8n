import { ClientOAuth2 } from '@n8n/client-oauth2';
import type { INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import nock from 'nock';

import { AtlassianOAuth2Api } from '../AtlassianOAuth2Api.credentials';
import { ConfluenceCloudOAuth2Api } from '../ConfluenceCloudOAuth2Api.credentials';
import { OAuth2Api } from '../OAuth2Api.credentials';

describe('ConfluenceCloudOAuth2Api Credential', () => {
	const confluenceOAuth2Api = new ConfluenceCloudOAuth2Api();
	const defaultScopes = (
		confluenceOAuth2Api.properties.find((p) => p.name === 'enabledScopes')?.default as string
	).split(' ');

	// Endpoints derive from the resolved extends chain so base-credential regressions fail here
	const resolvedProperties: INodeProperties[] = [];
	NodeHelpers.mergeNodeProperties(resolvedProperties, new OAuth2Api().properties);
	NodeHelpers.mergeNodeProperties(resolvedProperties, new AtlassianOAuth2Api().properties);
	NodeHelpers.mergeNodeProperties(resolvedProperties, confluenceOAuth2Api.properties);
	const resolvedDefault = (name: string) =>
		resolvedProperties.find((p) => p.name === name)?.default as string;

	const authorizationUri = resolvedDefault('authUrl');
	const accessTokenUri = resolvedDefault('accessTokenUrl');
	const baseUrl = new URL(accessTokenUri).origin;
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

		const pinnedScopes = [
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
		expect(defaultScopes).toEqual(pinnedScopes);

		const scopeProperty = confluenceOAuth2Api.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toContain(pinnedScopes.join(' '));
	});

	it('should resolve the extends chain', () => {
		const byName = (name: string) => resolvedProperties.find((p) => p.name === name);

		const domain = byName('domain');
		expect(domain?.type).toBe('string');
		expect(domain?.required).toBe(true);
		expect(domain?.displayName).toBe('Site URL');

		expect(byName('grantType')?.default).toBe('authorizationCode');
		expect(byName('authUrl')?.default).toBe('https://auth.atlassian.com/authorize');
		expect(byName('accessTokenUrl')?.default).toBe('https://auth.atlassian.com/oauth/token');
		expect(byName('authQueryParameters')?.default).toBe(
			'audience=api.atlassian.com&prompt=consent',
		);
		expect(byName('authentication')?.default).toBe('header');
		expect(byName('customScopes')?.default).toBe(false);
		expect(byName('enabledScopes')?.default).toBe(defaultScopes.join(' '));

		const scope = byName('scope');
		expect(scope?.type).toBe('hidden');
		expect(scope?.default).toBe(
			'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
		);
	});

	it('should inherit the Site URL field from atlassianOAuth2Api', () => {
		// Defined on the base; the credential must not shadow it
		expect(confluenceOAuth2Api.properties.find((p) => p.name === 'domain')).toBeUndefined();
		expect(confluenceOAuth2Api.properties.find((p) => p.name === 'siteUrl')).toBeUndefined();
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include every default scope in the authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			for (const scope of defaultScopes) {
				expect(authUri).toContain(encodeURIComponent(scope));
			}
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve a token carrying the default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toBe(defaultScopes.join(' '));
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
