import Csrf from 'csrf';
import { type Response } from 'express';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';
import nock from 'nock';
import Container from 'typedi';

import { Time } from '@/constants';
import { OAuth2CredentialController } from '@/controllers/oauth/oauth2-credential.controller';
import { CredentialsHelper } from '@/credentials-helper';
import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import type { User } from '@/databases/entities/user';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { VariablesService } from '@/environments/variables/variables.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExternalHooks } from '@/external-hooks';
import { Logger } from '@/logging/logger.service';
import type { OAuthRequest } from '@/requests';
import { SecretsHelper } from '@/secrets-helpers';
import { mockInstance } from '@test/mocking';

describe('OAuth2CredentialController', () => {
	mockInstance(Logger);
	mockInstance(SecretsHelper);
	mockInstance(VariablesService, {
		getAllCached: async () => [],
	});
	const cipher = mockInstance(Cipher);
	const externalHooks = mockInstance(ExternalHooks);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const sharedCredentialsRepository = mockInstance(SharedCredentialsRepository);

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
	});

	const controller = Container.get(OAuth2CredentialController);

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();

		credentialsHelper.applyDefaultsAndOverwrites.mockReturnValue({
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
			sharedCredentialsRepository.findCredentialForUser.mockResolvedValueOnce(null);

			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new NotFoundError('Credential not found'),
			);
		});

		it('should return a valid auth URI', async () => {
			jest.spyOn(Csrf.prototype, 'secretSync').mockReturnValueOnce(csrfSecret);
			jest.spyOn(Csrf.prototype, 'create').mockReturnValueOnce('token');
			sharedCredentialsRepository.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});
			cipher.encrypt.mockReturnValue('encrypted');

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
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: 'encrypted',
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
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
			cipher.encrypt.mockReturnValue('encrypted');

			await controller.handleCallback(req, res);

			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.callback', [
				expect.objectContaining({
					clientId: 'test-client-id',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				}),
			]);
			expect(cipher.encrypt).toHaveBeenCalledWith({
				oauthTokenData: { access_token: 'access-token', refresh_token: 'refresh-token' },
			});
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: 'encrypted',
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});
	});
});
