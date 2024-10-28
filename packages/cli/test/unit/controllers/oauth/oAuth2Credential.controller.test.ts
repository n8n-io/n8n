import nock from 'nock';
import Container from 'typedi';
import Csrf from 'csrf';
import { type Response } from 'express';
import { Cipher } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import { OAuth2CredentialController } from '@/controllers/oauth/oAuth2Credential.controller';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@db/entities/User';
import type { OAuthRequest } from '@/requests';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { ExternalHooks } from '@/ExternalHooks';
import { Logger } from '@/Logger';
import { VariablesService } from '@/environments/variables/variables.service.ee';
import { SecretsHelper } from '@/SecretsHelpers';
import { CredentialsHelper } from '@/CredentialsHelper';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { mockInstance } from '../../../shared/mocking';

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

	beforeEach(() => {
		jest.resetAllMocks();
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
			credentialsHelper.applyDefaultsAndOverwrites.mockReturnValue({
				clientId: 'test-client-id',
				authUrl: 'https://example.domain/o/oauth2/v2/auth',
			});
			cipher.encrypt.mockReturnValue('encrypted');

			const req = mock<OAuthRequest.OAuth2Credential.Auth>({ user, query: { id: '1' } });
			const authUri = await controller.getAuthUri(req);
			expect(authUri).toEqual(
				'https://example.domain/o/oauth2/v2/auth?client_id=test-client-id&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback&response_type=code&state=eyJ0b2tlbiI6InRva2VuIiwiY2lkIjoiMSJ9&scope=openid',
			);
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
			}),
		).toString('base64');

		it('should render the error page when required query params are missing', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { code: undefined, state: undefined },
			});
			const res = mock<Response>();
			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Insufficient parameters for OAuth2 callback.',
					reason: 'Received following query parameters: undefined',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('should render the error page when `state` query param is invalid', async () => {
			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { code: 'code', state: 'invalid-state' },
			});
			const res = mock<Response>();
			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Invalid state format',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('should render the error page when credential is not found in DB', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(null);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { code: 'code', state: validState },
			});
			const res = mock<Response>();
			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'OAuth2 callback failed because of insufficient permissions',
				},
			});
			expect(credentialsRepository.findOneBy).toHaveBeenCalledTimes(1);
			expect(credentialsRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
		});

		it('should render the error page when csrfSecret on the saved credential does not match the state', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(false);

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { code: 'code', state: validState },
			});
			const res = mock<Response>();
			await controller.handleCallback(req, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth2 callback state is invalid!',
				},
			});
			expect(externalHooks.run).not.toHaveBeenCalled();
		});

		it('should exchange the code for a valid token, and save it to DB', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			credentialsHelper.applyDefaultsAndOverwrites.mockReturnValue({
				clientId: 'test-client-id',
				clientSecret: 'oauth-secret',
				accessTokenUrl: 'https://example.domain/token',
			});
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);
			nock('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(200, { access_token: 'access-token', refresh_token: 'refresh-token' });
			cipher.encrypt.mockReturnValue('encrypted');

			const req = mock<OAuthRequest.OAuth2Credential.Callback>({
				query: { code: 'code', state: validState },
				originalUrl: '?code=code',
			});
			const res = mock<Response>();
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
