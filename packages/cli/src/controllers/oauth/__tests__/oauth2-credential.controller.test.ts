import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { type CredentialsEntity, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';
import { OAuth2CredentialController } from '@/controllers/oauth/oauth2-credential.controller';
import type { OAuthRequest } from '@/requests';
import { OauthService } from '@/oauth/oauth.service';
import { ExternalHooks } from '@/external-hooks';

jest.mock('axios');
jest.mock('@n8n/client-oauth2');
jest.mock('pkce-challenge');

describe('OAuth2CredentialController', () => {
	const oauthService = mockInstance(OauthService);
	const externalHooks = mockInstance(ExternalHooks);

	mockInstance(Logger);

	const controller = Container.get(OAuth2CredentialController);

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();
	});

	describe('getAuthUri', () => {
		it('should return a valid auth URI', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetUri = jest.fn().mockReturnValue({
				toString: () =>
					'https://example.domain/oauth2/auth?client_id=client_id&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback&response_type=code&state=state&scope=openid',
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getUri: mockGetUri,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			oauthService.getCredential.mockResolvedValueOnce(mockResolvedCredential);
			oauthService.getOAuthCredentials.mockResolvedValueOnce({
				clientId: 'client_id',
				clientSecret: 'client_secret',
				authUrl: 'https://example.domain/oauth2/auth',
				accessTokenUrl: 'https://example.domain/oauth2/token',
				scope: 'openid',
				grantType: 'authorizationCode',
				authentication: 'header',
			});
			oauthService.generateAOauth2AuthUri.mockResolvedValue('https://example.domain/oauth2/auth');

			const req = mock<OAuthRequest.OAuth2Credential.Auth>({
				user: mock<User>({ id: '123' }),
				query: { id: '1' },
			});

			const authUri = await controller.getAuthUri(req);

			expect(authUri).toContain('https://example.domain/oauth2/auth');
			expect(oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(mockResolvedCredential, {
				cid: '1',
				origin: 'static-credential',
				userId: '123',
			});
		});
	});

	describe('handleCallback', () => {
		const validState = Buffer.from(
			JSON.stringify({
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'static-credential',
				createdAt: timestamp,
				data: 'encrypted-data',
			}),
		).toString('base64');

		const res = mock<Response>();

		it('should render the error page when required query params are missing', async () => {
			const invalidReq = mock<OAuthRequest.OAuth2Credential.Callback>();
			invalidReq.query = { state: 'test' } as OAuthRequest.OAuth2Credential.Callback['query'];
			await controller.handleCallback(invalidReq, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Insufficient parameters for OAuth2 callback.',
				'Received following query parameters: {"state":"test"}',
			);
		});

		it('should exchange the code for a valid token, and save it to DB for static credential', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockResolvedValue({
				data: { access_token: 'new_token', refresh_token: 'refresh_token' },
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: validState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				mockResolvedCredential,
				expect.objectContaining({
					oauthTokenData: { access_token: 'new_token', refresh_token: 'refresh_token' },
				}),
				['csrfSecret'],
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.callback', expect.any(Array));
		});

		it('should handle dynamic credential callback successfully', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const oauthTokenData = { access_token: 'new_token', refresh_token: 'refresh_token' };
			const mockGetToken = jest.fn().mockResolvedValue({
				data: oauthTokenData,
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockDecryptedData = { csrfSecret: 'csrf-secret', existing: 'data' };
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'dynamic-credential' as const,
				credentialResolverId: 'resolver-id',
				authorizationHeader: 'Bearer token123',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				mockDecryptedData,
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);
			oauthService.saveDynamicCredential.mockResolvedValueOnce(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: dynamicState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			// The controller passes decryptedDataOriginal directly, not the merged oauthTokenData
			expect(oauthService.saveDynamicCredential).toHaveBeenCalledWith(
				mockResolvedCredential,
				{
					oauthTokenData,
				},
				'token123',
				'resolver-id',
			);
			expect(oauthService.encryptAndSaveData).not.toHaveBeenCalled();
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});

		it('should render error when credentialResolverId is missing for dynamic credential', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockResolvedValue({
				data: { access_token: 'new_token', refresh_token: 'refresh_token' },
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'dynamic-credential' as const,
				authorizationHeader: 'Bearer token123',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: dynamicState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Credential resolver ID is required',
			);
			expect(oauthService.saveDynamicCredential).not.toHaveBeenCalled();
		});

		it('should render error when authorizationHeader is missing for dynamic credential', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockResolvedValue({
				data: { access_token: 'new_token', refresh_token: 'refresh_token' },
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'dynamic-credential' as const,
				credentialResolverId: 'resolver-id',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: dynamicState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Authorization header is required',
			);
			expect(oauthService.saveDynamicCredential).not.toHaveBeenCalled();
		});

		it('should render error when authorizationHeader does not start with Bearer', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockResolvedValue({
				data: { access_token: 'new_token', refresh_token: 'refresh_token' },
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'dynamic-credential' as const,
				credentialResolverId: 'resolver-id',
				authorizationHeader: 'Invalid token123',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: dynamicState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Authorization header is required',
			);
			expect(oauthService.saveDynamicCredential).not.toHaveBeenCalled();
		});

		it('should handle static credential callback when origin is undefined', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockResolvedValue({
				data: { access_token: 'new_token', refresh_token: 'refresh_token' },
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const undefinedOriginState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: undefinedOriginState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				mockResolvedCredential,
				expect.objectContaining({
					oauthTokenData: { access_token: 'new_token', refresh_token: 'refresh_token' },
				}),
				['csrfSecret'],
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});

		it('should handle PKCE flow', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockResolvedValue({
				data: { access_token: 'new_token' },
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret', codeVerifier: 'code_verifier' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'pkce',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: validState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			expect(mockGetToken).toHaveBeenCalledWith(
				expect.stringContaining('code=auth_code'),
				expect.objectContaining({
					body: { code_verifier: 'code_verifier' },
				}),
			);
			expect(oauthService.encryptAndSaveData).toHaveBeenCalled();
		});

		it('should handle body authentication method', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockResolvedValue({
				data: { access_token: 'new_token' },
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'body',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: validState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			expect(mockGetToken).toHaveBeenCalledWith(
				expect.stringContaining('code=auth_code'),
				expect.objectContaining({
					body: expect.objectContaining({
						client_id: 'client_id',
						client_secret: 'client_secret',
					}),
				}),
			);
		});

		it('should handle callback with additional query parameters', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockResolvedValue({
				data: { access_token: 'new_token' },
			});
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: validState,
					extra: 'param',
				} as OAuthRequest.OAuth2Credential.Callback['query'] & { extra: string },
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state&extra=param',
			});

			await controller.handleCallback(req, res);

			expect(mockGetToken).toHaveBeenCalled();
			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				mockResolvedCredential,
				expect.objectContaining({
					oauthTokenData: expect.objectContaining({
						access_token: 'new_token',
						callbackQueryString: expect.objectContaining({
							extra: 'param',
						}),
					}),
				}),
				['csrfSecret'],
			);
		});

		it('should handle errors and render error page', async () => {
			const { ClientOAuth2 } = await import('@n8n/client-oauth2');
			const mockGetToken = jest.fn().mockRejectedValue(new Error('Token exchange failed'));
			jest.mocked(ClientOAuth2).mockImplementation(
				() =>
					({
						code: {
							getToken: mockGetToken,
						},
					}) as any,
			);

			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				userId: '123',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'csrf-secret' },
				{
					clientId: 'client_id',
					clientSecret: 'client_secret',
					authUrl: 'https://example.domain/oauth2/auth',
					accessTokenUrl: 'https://example.domain/oauth2/token',
					scope: 'openid',
					grantType: 'authorizationCode',
					authentication: 'header',
				},
				mockState,
			]);
			oauthService.getBaseUrl.mockReturnValue('http://localhost:5678/rest/oauth2-credential');
			externalHooks.run.mockResolvedValue(undefined);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: {
					code: 'auth_code',
					state: validState,
				},
				originalUrl: '/oauth2-credential/callback?code=auth_code&state=state',
			});

			await controller.handleCallback(req, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Token exchange failed',
				undefined,
			);
		});
	});
});
