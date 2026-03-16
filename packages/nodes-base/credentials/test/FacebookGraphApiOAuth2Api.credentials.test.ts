import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { FacebookGraphApiOAuth2Api } from '../FacebookGraphApiOAuth2Api.credentials';

describe('FacebookGraphApiOAuth2Api Credential', () => {
	const credential = new FacebookGraphApiOAuth2Api();
	const defaultScopes = [
		'public_profile',
		'email',
		'pages_show_list',
		'pages_read_engagement',
		'pages_read_user_content',
		'pages_manage_metadata',
		'pages_manage_posts',
		'business_management',
	];

	// Shared OAuth2 configuration
	const authorizationUri = 'https://www.facebook.com/v19.0/dialog/oauth';
	const accessTokenUri = 'https://graph.facebook.com/v19.0/oauth/access_token';
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
		nock('https://graph.facebook.com')
			.post('/v19.0/oauth/access_token', (body: Record<string, unknown>) => {
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
				scope: responseScopes.join(','),
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
		expect(credential.name).toBe('facebookGraphApiOAuth2Api');
		expect(credential.extends).toEqual(['oAuth2Api']);

		const enabledScopesProperty = credential.properties.find((p) => p.name === 'enabledScopes');
		expect(enabledScopesProperty?.default).toBe(defaultScopes.join(' '));

		const authUrlProperty = credential.properties.find((p) => p.name === 'authUrl');
		expect(authUrlProperty?.default).toBe('https://www.facebook.com/v19.0/dialog/oauth');

		const accessTokenUrlProperty = credential.properties.find((p) => p.name === 'accessTokenUrl');
		expect(accessTokenUrlProperty?.default).toBe(
			'https://graph.facebook.com/v19.0/oauth/access_token',
		);
	});

	it('should have custom scopes toggle defaulting to false', () => {
		const customScopesProperty = credential.properties.find((p) => p.name === 'customScopes');
		expect(customScopesProperty?.default).toBe(false);
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('public_profile');
			expect(authUri).toContain('email');
			expect(authUri).toContain('pages_show_list');
			expect(authUri).toContain('pages_read_engagement');
			expect(authUri).toContain('pages_read_user_content');
			expect(authUri).toContain('pages_manage_metadata');
			expect(authUri).toContain('pages_manage_posts');
			expect(authUri).toContain('business_management');
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('public_profile');
			expect(token.data.scope).toContain('email');
			expect(token.data.scope).toContain('pages_read_engagement');
			expect(token.data.scope).toContain('business_management');
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [
			'public_profile',
			'email',
			'ads_read',
			'ads_management',
			'business_management',
		];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('public_profile');
			expect(authUri).toContain('ads_read');
			expect(authUri).toContain('ads_management');
		});

		it('should retrieve token successfully with custom scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, customScopes);

			const oauthClient = createOAuthClient(customScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('public_profile');
			expect(token.data.scope).toContain('ads_read');
			expect(token.data.scope).toContain('ads_management');
		});

		it('should handle completely different custom scopes', async () => {
			const differentScopes = [
				'public_profile',
				'email',
				'instagram_basic',
				'instagram_content_publish',
			];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, differentScopes);

			const oauthClient = createOAuthClient(differentScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('instagram_basic');
			expect(authUri).toContain('instagram_content_publish');
			expect(authUri).not.toContain('pages_manage_posts');
			expect(authUri).not.toContain('business_management');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('instagram_basic');
			expect(token.data.scope).toContain('instagram_content_publish');
			expect(token.data.scope).not.toContain('pages_manage_posts');
			expect(token.data.scope).not.toContain('business_management');
		});
	});
});
