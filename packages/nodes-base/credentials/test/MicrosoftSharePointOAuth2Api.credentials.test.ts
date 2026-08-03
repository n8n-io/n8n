import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { MicrosoftSharePointOAuth2Api } from '../MicrosoftSharePointOAuth2Api.credentials';

describe('MicrosoftSharePointOAuth2Api Credential', () => {
	const credential = new MicrosoftSharePointOAuth2Api();
	const subdomain = 'tenant123';
	const defaultScopes = [
		'openid',
		'offline_access',
		`https://${subdomain}.sharepoint.com/.default`,
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

	describe('credential metadata', () => {
		it('should have correct name and parent credential', () => {
			expect(credential.name).toBe('microsoftSharePointOAuth2Api');
			expect(credential.extends).toEqual(['microsoftOAuth2Api']);
			expect(credential.displayName).toBe('Microsoft SharePoint OAuth2 API');
		});

		it('should expose a customScopes toggle that defaults to off', () => {
			const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
			expect(customScopesProperty).toBeDefined();
			expect(customScopesProperty?.type).toBe('boolean');
			expect(customScopesProperty?.default).toBe(false);
		});

		it('should expose an enabledScopes property with the default scopes', () => {
			const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
			expect(enabledScopesProperty).toBeDefined();
			expect(enabledScopesProperty?.type).toBe('string');
			expect(enabledScopesProperty?.default).toBe(
				'openid offline_access https://{subdomain}.sharepoint.com/.default',
			);
			expect(enabledScopesProperty?.displayOptions).toEqual({ show: { customScopes: [true] } });
		});

		it('should expose a subdomain input', () => {
			const subdomainProperty = credential.properties.find((p) => p.name === 'subdomain');
			expect(subdomainProperty).toBeDefined();
			expect(subdomainProperty?.type).toBe('string');
		});

		it('should define a hidden scope expression that substitutes the subdomain placeholder', () => {
			const scopeProperty = credential.properties.find((p) => p.name === 'scope');
			expect(scopeProperty).toBeDefined();
			expect(scopeProperty?.type).toBe('hidden');
			expect(scopeProperty?.default).toBe(
				'={{($self["customScopes"] ? $self["enabledScopes"] : "openid offline_access https://{subdomain}.sharepoint.com/.default").replace(/\\{subdomain\\}/g, $self["subdomain"])}}',
			);
		});
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('openid');
			expect(authUri).toContain('offline_access');
			expect(authUri).toContain(`${subdomain}.sharepoint.com`);
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toBe(
				`openid offline_access https://${subdomain}.sharepoint.com/.default`,
			);
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [
			'openid',
			'offline_access',
			`https://${subdomain}.sharepoint.com/.default`,
			`https://${subdomain}.sharepoint.com/Sites.Read.All`,
			`https://${subdomain}.sharepoint.com/Sites.FullControl.All`,
		];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('Sites.Read.All');
			expect(authUri).toContain('Sites.FullControl.All');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('openid');
			expect(token.data.scope).toContain('offline_access');
			expect(token.data.scope).toContain(`https://${subdomain}.sharepoint.com/.default`);
			expect(token.data.scope).toContain('Sites.Read.All');
			expect(token.data.scope).toContain('Sites.FullControl.All');
		});
	});
});
