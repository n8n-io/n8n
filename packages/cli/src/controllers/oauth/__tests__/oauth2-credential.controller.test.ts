import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import type { CredentialsEntity, User } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import Csrf from 'csrf';
import { type Response } from 'express';
import { captor, mock } from 'jest-mock-extended';
import { Cipher, type InstanceSettings, ExternalSecretsProxy } from 'n8n-core';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import nock from 'nock';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import { OAuth2CredentialController } from '@/controllers/oauth/oauth2-credential.controller';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsHelper } from '@/credentials-helper';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExternalHooks } from '@/external-hooks';
import type { OAuthRequest } from '@/requests';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

jest.mock('@/workflow-execute-additional-data');

describe('OAuth2CredentialController', () => {
	mockInstance(Logger);
	mockInstance(ExternalSecretsProxy);
	mockInstance(VariablesService, {
		getAllCached: async () => [],
	});
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	(WorkflowExecuteAdditionalData.getBase as jest.Mock).mockReturnValue(additionalData);

	const cipher = new Cipher(mock<InstanceSettings>({ encryptionKey: 'password' }));
	Container.set(Cipher, cipher);

	const externalHooks = mockInstance(ExternalHooks);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const credentialsFinderService = mockInstance(CredentialsFinderService);

	const csrfSecret = 'csrf-secret';
	const user = mock<User>({
		id: '123',
		password: 'password',
		authIdentities: [],
		role: 'global:owner',
	});
	const credential = mock<CredentialsEntity>({
		id: '1',
		name: 'Test Credential',
		type: 'oAuth2Api',
		data: cipher.encrypt({}),
	});

	const controller = Container.get(OAuth2CredentialController);

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();

		credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue({
			clientId: 'test-client-id',
			clientSecret: 'oauth-secret',
			authUrl: 'https://example.domain/o/oauth2/v2/auth',
			accessTokenUrl: 'https://example.domain/token',
		});
	});

	describe('getAuthUri', () => {
		it('should throw a BadRequestError when credentialId is missing in the query', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ query: { id: '' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new BadRequestError('Required credential ID is missing'),
			);
		});

		it('should throw a NotFoundError when no matching credential is found for the user', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(null);

			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new NotFoundError('Credential not found'),
			);
		});

		it('should return a valid auth URI', async () => {
			jest.spyOn(Csrf.prototype, 'secretSync').mockReturnValueOnce(csrfSecret);
			jest.spyOn(Csrf.prototype, 'create').mockReturnValueOnce('token');
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});

			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			const authUri = await controller.getAuthUri(req);
			expect(authUri).toEqual(
				'https://example.domain/o/oauth2/v2/auth?client_id=test-client-id&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback&response_type=code&state=eyJ0b2tlbiI6InRva2VuIiwiY2lkIjoiMSIsImNyZWF0ZWRBdCI6MTcwNjc1MDYyNTY3OCwidXNlcklkIjoiMTIzIn0%3D&scope=openid',
			);
			const state = new URL(authUri).searchParams.get('state');
			expect(JSON.parse(Buffer.from(state!, 'base64').toString())).toEqual({
				token: 'token',
				cid: '1',
				createdAt: timestamp,
				userId: '123',
			});
			const dataCaptor = captor();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({ csrfSecret: 'csrf-secret' }),
			);
			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				additionalData,
				credential,
				credential.type,
				'internal',
				undefined,
				false,
			);
		});
	});

	describe('handleCallback', () => {
		const validState = Buffer.from(
			JSON.stringify({
				token: 'token',
				cid: '1',
				createdAt: timestamp,
			}),
		).toString('base64');

		const res = mock<Response>();
		const req = mock<OAuthRequest.OAuth2Credential.Callback>({
			query: { code: 'code', state: validState },
			originalUrl: '?code=code',
		});

		it('should render the error page when required query params are missing', async () => {
			const invalidReq = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { code: undefined, state: undefined },
			});
			await controller.handleCallback(invalidReq, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Insufficient parameters for OAuth2 callback.',
					reason: 'Received following query parameters: undefined',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('should render the error page when `state` query param is invalid', async () => {
			const invalidReq = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { code: 'code', state: 'invalid-state' },
			});

			await controller.handleCallback(invalidReq, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Invalid state format',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('should render the error page when credential is not found in DB', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(null);

			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'OAuth callback failed because of insufficient permissions',
				},
			});
			expect(credentialsRepository.findOneBy).toHaveBeenCalledTimes(1);
			expect(credentialsRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
		});

		it('should render the error page when csrfSecret on the saved credential does not match the state', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(false);

			await controller.handleCallback(req, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth callback state is invalid!',
				},
			});
			expect(externalHooks.run).not.toHaveBeenCalled();
		});

		it('should render the error page when state is older than 5 minutes', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);

			jest.advanceTimersByTime(10 * Time.minutes.toMilliseconds);

			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth callback state is invalid!',
				},
			});
			expect(externalHooks.run).not.toHaveBeenCalled();
		});

		it('should render the error page when code exchange fails', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);
			nock('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(403, { error: 'Code could not be exchanged' });

			await controller.handleCallback(req, res);

			expect(externalHooks.run).toHaveBeenCalled();
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Code could not be exchanged',
					reason: '{"error":"Code could not be exchanged"}',
				},
			});
		});

		it('should render the error page when code exchange fails, and the server responses with html', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);
			nock('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(403, '<html><body>Code could not be exchanged</body></html>', {
					'Content-Type': 'text/html',
				});

			await controller.handleCallback(req, res);

			expect(externalHooks.run).toHaveBeenCalled();
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Unsupported content type: text/html',
					reason: '"<html><body>Code could not be exchanged</body></html>"',
				},
			});
		});

		it('should exchange the code for a valid token, and save it to DB', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);
			nock('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(200, { access_token: 'access-token', refresh_token: 'refresh-token' });

			await controller.handleCallback(req, res);

			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.callback', [
				expect.objectContaining({
					clientId: 'test-client-id',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				}),
			]);
			const dataCaptor = captor();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({
					oauthTokenData: { access_token: 'access-token', refresh_token: 'refresh-token' },
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				additionalData,
				credential,
				credential.type,
				'internal',
				undefined,
				true,
			);
		});

		it('merges oauthTokenData if it already exists', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				csrfSecret,
				oauthTokenData: { token: true },
			});
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);
			nock('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(200, { access_token: 'access-token', refresh_token: 'refresh-token' });

			await controller.handleCallback(req, res);

			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.callback', [
				expect.objectContaining({
					clientId: 'test-client-id',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				}),
			]);
			const dataCaptor = captor();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({
					oauthTokenData: {
						token: true,
						access_token: 'access-token',
						refresh_token: 'refresh-token',
					},
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});

		it('overwrites oauthTokenData if it is a string', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				csrfSecret,
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
			});
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);
			nock('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(200, { access_token: 'access-token', refresh_token: 'refresh-token' });

			await controller.handleCallback(req, res);

			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.callback', [
				expect.objectContaining({
					clientId: 'test-client-id',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				}),
			]);
			const dataCaptor = captor();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({
					oauthTokenData: { access_token: 'access-token', refresh_token: 'refresh-token' },
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});
	});

	describe('refreshToken', () => {
		it('should refresh expired OAuth2 token successfully', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			const expiredTokenData = {
				access_token: 'old-access-token',
				refresh_token: 'refresh-token',
				expires_in: '3600',
				token_type: 'bearer',
			};

			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				oauthTokenData: expiredTokenData,
			});
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				accessTokenUrl: 'https://example.domain/token',
			});

			nock('https://example.domain').post('/token').reply(200, {
				access_token: 'new-access-token',
				refresh_token: 'new-refresh-token',
				expires_in: '3600',
				token_type: 'bearer',
			});

			const result = await controller.refreshToken(req);

			expect(result.success).toBe(true);
			expect(result.message).toBe('Token refreshed successfully');
			expect(result.tokenData?.access_token).toBe('new-access-token');
			expect(result.expiresAt).toBeDefined();
		});

		it('should return error when no refresh token available', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				oauthTokenData: {
					access_token: 'access-token',
					// no refresh_token
				},
			});

			const result = await controller.refreshToken(req);

			expect(result.success).toBe(false);
			expect(result.message).toBe('No refresh token available. Please re-authenticate.');
		});

		it('should return success if token is still valid', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			const validTokenData = {
				access_token: 'valid-access-token',
				refresh_token: 'refresh-token',
				expires_in: '7200', // 2 hours
				token_type: 'bearer',
			};

			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				oauthTokenData: validTokenData,
			});
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				accessTokenUrl: 'https://example.domain/token',
			});

			const result = await controller.refreshToken(req);

			expect(result.success).toBe(true);
			expect(result.message).toBe('Token is still valid');
			expect(result.tokenData?.access_token).toBe('valid-access-token');
		});
	});

	describe('getTokenStatus', () => {
		it('should return token status for valid token', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			const tokenData = {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
				expires_in: '3600',
				token_type: 'bearer',
				scope: 'read write',
			};

			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				oauthTokenData: tokenData,
			});
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				accessTokenUrl: 'https://example.domain/token',
			});

			const result = await controller.getTokenStatus(req);

			expect(result.isValid).toBe(true);
			expect(result.isExpired).toBe(false);
			expect(result.hasRefreshToken).toBe(true);
			expect(result.scope).toBe('read write');
			expect(result.tokenType).toBe('bearer');
			expect(result.message).toBe('Token is valid');
		});

		it('should return error status when no token data found', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});

			const result = await controller.getTokenStatus(req);

			expect(result.isValid).toBe(false);
			expect(result.isExpired).toBe(true);
			expect(result.hasRefreshToken).toBe(false);
			expect(result.message).toBe('No OAuth token data found');
		});
	});

	describe('completeCredentialFlow', () => {
		it('should complete OAuth2 flow successfully', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			const tokenData = {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
				token_type: 'bearer',
				scope: 'read write',
			};

			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				oauthTokenData: tokenData,
				csrfSecret: 'secret',
				codeVerifier: 'verifier',
			});
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				accessTokenUrl: 'https://example.domain/token',
			});

			const result = await controller.completeCredentialFlow(req);

			expect(result.success).toBe(true);
			expect(result.message).toBe('OAuth2 credential flow completed successfully');
			expect(result.credentialId).toBe(credential.id);
			expect(result.flowMetadata?.hasRefreshToken).toBe(true);
			expect(result.flowMetadata?.scope).toBe('read write');
			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.complete', [
				expect.objectContaining({
					credentialId: credential.id,
					userId: user.id,
				}),
			]);
		});

		it('should return error when no token data found', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});

			const result = await controller.completeCredentialFlow(req);

			expect(result.success).toBe(false);
			expect(result.message).toBe('OAuth flow not completed. No token data found.');
		});
	});

	describe('revokeToken', () => {
		it('should revoke tokens successfully with provider notification', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			const tokenData = {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
			};

			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				oauthTokenData: tokenData,
			});
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				revokeTokenUrl: 'https://example.domain/revoke',
			});

			nock('https://example.domain').post('/revoke').twice().reply(200);

			const result = await controller.revokeToken(req);

			expect(result.success).toBe(true);
			expect(result.message).toContain('Provider notified');
			expect(result.revokedTokens).toEqual(['refresh_token', 'access_token']);
			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.revoke', [
				expect.objectContaining({
					credentialId: credential.id,
					userId: user.id,
					revokedTokens: ['refresh_token', 'access_token'],
				}),
			]);
		});

		it('should clear local tokens when no revoke URL available', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			const tokenData = {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
			};

			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				oauthTokenData: tokenData,
			});
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				// no revokeTokenUrl
			});

			const result = await controller.revokeToken(req);

			expect(result.success).toBe(true);
			expect(result.message).toContain('Local tokens cleared');
			expect(result.revokedTokens).toEqual([]);
		});

		it('should return error when no token data found', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});

			const result = await controller.revokeToken(req);

			expect(result.success).toBe(false);
			expect(result.message).toBe('No OAuth token data found to revoke');
			expect(result.revokedTokens).toEqual([]);
		});
	});
});
