import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { type CredentialsEntity, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';
import { OAuth1CredentialController } from '@/controllers/oauth/oauth1-credential.controller';
import { EventService } from '@/events/event.service';
import type { OAuthRequest } from '@/requests';
import { OauthService } from '@/oauth/oauth.service';
import { ExternalHooks } from '@/external-hooks';

describe('OAuth1CredentialController', () => {
	const oauthService = mockInstance(OauthService);
	const eventService = mockInstance(EventService);

	mockInstance(Logger);
	mockInstance(ExternalHooks);

	const controller = Container.get(OAuth1CredentialController);

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	const accessTokenData = { oauth_token: 'token', oauth_token_secret: 'secret' };

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();
	});

	describe('getAuthUri', () => {
		it('should build CSRF state data and return a valid auth URI', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockCsrfData = { cid: '1', origin: 'static-credential' as const, userId: '123' };
			oauthService.getCredentialForUpdate.mockResolvedValueOnce(mockResolvedCredential);
			oauthService.buildCsrfStateData.mockResolvedValueOnce(mockCsrfData);
			oauthService.generateAOauth1AuthUri.mockResolvedValueOnce(
				'https://example.domain/oauth/authorize?oauth_token=random-token',
			);
			const req = mock<OAuthRequest.OAuth1Credential.Auth>({
				user: mock<User>({ id: '123' }),
				query: { id: '1' },
			});
			const res = mock<Response>();
			const authUri = await controller.getAuthUri(req, res);
			expect(authUri).toEqual('https://example.domain/oauth/authorize?oauth_token=random-token');
			expect(oauthService.buildCsrfStateData).toHaveBeenCalledWith(mockResolvedCredential, req);
			expect(oauthService.generateAOauth1AuthUri).toHaveBeenCalledWith(
				mockResolvedCredential,
				mockCsrfData,
				req,
				res,
			);
		});
	});

	describe('handleCallback', () => {
		const validState = Buffer.from(
			JSON.stringify({
				token: 'token',
				cid: '1',
				origin: 'static-credential',
				createdAt: timestamp,
				data: 'encrypted-data',
			}),
		).toString('base64');

		const res = mock<Response>();
		const req = mock<OAuthRequest.OAuth1Credential.Callback>({
			query: {
				oauth_verifier: 'verifier',
				oauth_token: 'token',
				state: validState,
			},
		});

		it('should render the error page when required query params are missing', async () => {
			const invalidReq = mock<OAuthRequest.OAuth1Credential.Callback>();
			invalidReq.query = { state: 'test' } as OAuthRequest.OAuth1Credential.Callback['query'];
			await controller.handleCallback(invalidReq, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Insufficient parameters for OAuth1 callback.',
				'Received following query parameters: {"state":"test"}',
			);
		});

		it('should sign the access token request with the stored request token secret', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				mockState,
				{ csrfSecret: 'csrf-secret', oauthTokenSecret: 'request-token-secret' },
			]);
			oauthService.getOAuth1AccessToken.mockResolvedValueOnce(accessTokenData);

			await controller.handleCallback(req, res);

			expect(oauthService.getOAuth1AccessToken).toHaveBeenCalledWith(
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				{
					oauthToken: 'token',
					oauthVerifier: 'verifier',
					oauthTokenSecret: 'request-token-secret',
				},
			);
		});

		it('should exchange the verifier for a valid token, and save it to DB for static credential', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				mockState,
				{ csrfSecret: 'csrf-secret' },
			]);
			oauthService.getOAuth1AccessToken.mockResolvedValueOnce(accessTokenData);

			await controller.handleCallback(req, res);

			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				mockResolvedCredential,
				expect.objectContaining({
					oauthTokenData: expect.objectContaining({
						oauth_token: 'token',
						oauth_token_secret: 'secret',
					}),
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});

		it('should handle dynamic credential callback successfully', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				origin: 'dynamic-credential' as const,
				credentialResolverId: 'resolver-id',
				authorizationHeader: 'Bearer token123',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			const dynamicReq = mock<OAuthRequest.OAuth1Credential.Callback>({
				query: {
					oauth_verifier: 'verifier',
					oauth_token: 'token',
					state: dynamicState,
				},
			});

			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				mockState,
				{ csrfSecret: 'csrf-secret' },
			]);
			oauthService.getOAuth1AccessToken.mockResolvedValueOnce(accessTokenData);
			oauthService.saveDynamicCredential.mockResolvedValueOnce(undefined);

			await controller.handleCallback(dynamicReq, res);

			expect(oauthService.saveDynamicCredential).toHaveBeenCalledWith(
				mockResolvedCredential,
				expect.objectContaining({
					oauth_token: 'token',
					oauth_token_secret: 'secret',
				}),
				'token123',
				'resolver-id',
				{},
			);
			expect(eventService.emit).not.toHaveBeenCalledWith(
				'private-credential-user-connected',
				expect.anything(),
			);
			expect(oauthService.encryptAndSaveData).not.toHaveBeenCalled();
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});

		it('should emit "private-credential-user-connected" when state.userId is a string', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({
				id: 'cred-1',
				type: 'twitterOAuth1Api',
			});
			const mockState = {
				token: 'token',
				cid: '1',
				userId: 'user-42',
				origin: 'dynamic-credential' as const,
				credentialResolverId: 'resolver-id',
				authorizationHeader: 'Bearer token123',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			const dynamicReq = mock<OAuthRequest.OAuth1Credential.Callback>({
				query: {
					oauth_verifier: 'verifier',
					oauth_token: 'token',
					state: dynamicState,
				},
			});

			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				mockState,
				{ csrfSecret: 'csrf-secret' },
			]);
			oauthService.getOAuth1AccessToken.mockResolvedValueOnce(accessTokenData);
			oauthService.saveDynamicCredential.mockResolvedValueOnce(undefined);

			await controller.handleCallback(dynamicReq, res);

			expect(eventService.emit).toHaveBeenCalledWith('private-credential-user-connected', {
				user: { id: 'user-42' },
				credentialType: 'twitterOAuth1Api',
				credentialId: 'cred-1',
			});
		});

		it('should render error when credentialResolverId is missing for dynamic credential', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				origin: 'dynamic-credential' as const,
				authorizationHeader: 'Bearer token123',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			const dynamicReq = mock<OAuthRequest.OAuth1Credential.Callback>({
				query: {
					oauth_verifier: 'verifier',
					oauth_token: 'token',
					state: dynamicState,
				},
			});

			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				mockState,
				{ csrfSecret: 'csrf-secret' },
			]);
			oauthService.getOAuth1AccessToken.mockResolvedValueOnce(accessTokenData);

			await controller.handleCallback(dynamicReq, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Credential resolver ID is required',
			);
			expect(oauthService.saveDynamicCredential).not.toHaveBeenCalled();
		});

		it('should render error when authorizationHeader is missing for dynamic credential', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				origin: 'dynamic-credential' as const,
				credentialResolverId: 'resolver-id',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			const dynamicReq = mock<OAuthRequest.OAuth1Credential.Callback>({
				query: {
					oauth_verifier: 'verifier',
					oauth_token: 'token',
					state: dynamicState,
				},
			});

			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				mockState,
				{ csrfSecret: 'csrf-secret' },
			]);
			oauthService.getOAuth1AccessToken.mockResolvedValueOnce(accessTokenData);

			await controller.handleCallback(dynamicReq, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Authorization header is required',
			);
			expect(oauthService.saveDynamicCredential).not.toHaveBeenCalled();
		});

		it('should render error when authorizationHeader does not start with Bearer', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				origin: 'dynamic-credential' as const,
				credentialResolverId: 'resolver-id',
				authorizationHeader: 'Invalid token123',
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const dynamicState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			const dynamicReq = mock<OAuthRequest.OAuth1Credential.Callback>({
				query: {
					oauth_verifier: 'verifier',
					oauth_token: 'token',
					state: dynamicState,
				},
			});

			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				mockState,
				{ csrfSecret: 'csrf-secret' },
			]);
			oauthService.getOAuth1AccessToken.mockResolvedValueOnce(accessTokenData);

			await controller.handleCallback(dynamicReq, res);

			expect(oauthService.renderCallbackError).toHaveBeenCalledWith(
				res,
				'Authorization header is required',
			);
			expect(oauthService.saveDynamicCredential).not.toHaveBeenCalled();
		});

		it('should handle static credential callback when origin is undefined', async () => {
			const mockResolvedCredential = mock<CredentialsEntity>({ id: '1' });
			const mockState = {
				token: 'token',
				cid: '1',
				origin: 'static-credential' as const,
				createdAt: timestamp,
				data: 'encrypted-data',
			};
			const undefinedOriginState = Buffer.from(JSON.stringify(mockState)).toString('base64');
			const undefinedOriginReq = mock<OAuthRequest.OAuth1Credential.Callback>({
				query: {
					oauth_verifier: 'verifier',
					oauth_token: 'token',
					state: undefinedOriginState,
				},
			});

			oauthService.resolveCredential.mockResolvedValueOnce([
				mockResolvedCredential,
				{ csrfSecret: 'invalid' },
				{ accessTokenUrl: 'https://example.domain/oauth/access_token' },
				mockState,
				{ csrfSecret: 'csrf-secret' },
			]);
			oauthService.getOAuth1AccessToken.mockResolvedValueOnce(accessTokenData);

			await controller.handleCallback(undefinedOriginReq, res);

			expect(oauthService.encryptAndSaveData).toHaveBeenCalledWith(
				mockResolvedCredential,
				expect.objectContaining({
					oauthTokenData: expect.objectContaining({
						oauth_token: 'token',
						oauth_token_secret: 'secret',
					}),
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});
	});
});
