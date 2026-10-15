import { ClientOAuth2 } from '@n8n/client-oauth2';
import type { INodeProperties } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import nock from 'nock';

import { AtlassianOAuth2Api } from '../AtlassianOAuth2Api.credentials';
import { JiraSoftwareCloudOAuth2Api } from '../JiraSoftwareCloudOAuth2Api.credentials';
import { OAuth2Api } from '../OAuth2Api.credentials';

describe('JiraSoftwareCloudOAuth2Api Credential', () => {
	const jiraOAuth2Api = new JiraSoftwareCloudOAuth2Api();
	const defaultScopes = (
		jiraOAuth2Api.properties.find((p) => p.name === 'enabledScopes')?.default as string
	).split(' ');

	// Endpoints derive from the resolved extends chain so base-credential regressions fail here
	const resolvedProperties: INodeProperties[] = [];
	NodeHelpers.mergeNodeProperties(resolvedProperties, new OAuth2Api().properties);
	NodeHelpers.mergeNodeProperties(resolvedProperties, new AtlassianOAuth2Api().properties);
	NodeHelpers.mergeNodeProperties(resolvedProperties, jiraOAuth2Api.properties);
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
		expect(jiraOAuth2Api.name).toBe('jiraSoftwareCloudOAuth2Api');
		expect(jiraOAuth2Api.extends).toEqual(['atlassianOAuth2Api']);

		expect(defaultScopes).toEqual([
			'read:jira-user',
			'read:jira-work',
			'write:jira-work',
			'manage:jira-webhook',
			'offline_access',
		]);

		// Defined here, not on the Atlassian base: the Confluence sibling has no
		// site field, while existing Jira credentials keep storing it as `domain`
		const domain = jiraOAuth2Api.properties.find((p) => p.name === 'domain');
		expect(domain?.displayName).toBe('Site URL');
		expect(domain?.required).toBe(true);
	});

	it('should resolve the extends chain', () => {
		const resolved: INodeProperties[] = [];
		NodeHelpers.mergeNodeProperties(resolved, new OAuth2Api().properties);
		NodeHelpers.mergeNodeProperties(resolved, new AtlassianOAuth2Api().properties);
		NodeHelpers.mergeNodeProperties(resolved, jiraOAuth2Api.properties);

		const byName = (name: string) => resolved.find((p) => p.name === name);

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
