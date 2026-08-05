import { ClientOAuth2 } from '@n8n/client-oauth2';
import nock from 'nock';

import { GoogleSheetsOAuth2Api } from '../GoogleSheetsOAuth2Api.credentials';

describe('GoogleSheetsOAuth2Api Credential', () => {
	const googleSheetsOAuth2Api = new GoogleSheetsOAuth2Api();
	const defaultScopes = [
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/spreadsheets',
		'https://www.googleapis.com/auth/drive.metadata',
	];

	// Shared OAuth2 configuration (inherited from googleOAuth2Api)
	const authorizationUri = 'https://accounts.google.com/o/oauth2/v2/auth';
	const tokenBaseUrl = 'https://oauth2.googleapis.com';
	const accessTokenUri = `${tokenBaseUrl}/token`;
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
		nock(tokenBaseUrl)
			.post('/token', (body: Record<string, unknown>) => {
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
		expect(googleSheetsOAuth2Api.name).toBe('googleSheetsOAuth2Api');
		expect(googleSheetsOAuth2Api.extends).toEqual(['googleOAuth2Api']);

		// Custom scopes default to the node's required scopes
		const enabledScopesProperty = googleSheetsOAuth2Api.properties.find(
			(p) => p.name === 'enabledScopes',
		);
		expect(enabledScopesProperty?.default).toBe(defaultScopes.join(' '));
	});

	it('should keep scope hidden and resolve it from the customScopes toggle', () => {
		const scopeProperty = googleSheetsOAuth2Api.properties.find((p) => p.name === 'scope');
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toContain('$self["customScopes"] ? $self["enabledScopes"]');
		expect(scopeProperty?.default).toContain(defaultScopes.join(' '));
	});

	it('should preserve the existing Google APIs notice', () => {
		const noticeProperty = googleSheetsOAuth2Api.properties.find((p) => p.name === 'notice');
		expect(noticeProperty?.type).toBe('notice');
		expect(noticeProperty?.displayOptions).toEqual({ showOnDeployment: 'hosted' });
	});

	describe('OAuth2 flow with default scopes', () => {
		it('should include default scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(defaultScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('spreadsheets');
			expect(authUri).toContain('drive.file');
			expect(authUri).toContain(`client_id=${clientId}`);
			expect(authUri).toContain('response_type=code');
		});

		it('should retrieve token successfully with default scopes', async () => {
			const code = 'test-auth-code';
			mockTokenEndpoint(code, defaultScopes);

			const oauthClient = createOAuthClient(defaultScopes);
			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toBe(defaultScopes.join(' '));
		});
	});

	describe('OAuth2 flow with custom scopes', () => {
		const customScopes = [...defaultScopes, 'https://www.googleapis.com/auth/forms'];

		it('should include custom scopes in authorization URI', () => {
			const oauthClient = createOAuthClient(customScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('scope=');
			expect(authUri).toContain('spreadsheets');
			expect(authUri).toContain('forms');
		});

		it('should handle completely different custom scopes', async () => {
			const differentScopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
			const code = 'test-auth-code';
			mockTokenEndpoint(code, differentScopes);

			const oauthClient = createOAuthClient(differentScopes);
			const authUri = oauthClient.code.getUri();

			expect(authUri).toContain('spreadsheets.readonly');
			expect(authUri).not.toContain('drive.file');

			const token = await oauthClient.code.getToken(redirectUri + `?code=${code}`);

			expect(token.data.scope).toContain('spreadsheets.readonly');
			expect(token.data.scope).not.toContain('drive.file');
		});
	});
});
