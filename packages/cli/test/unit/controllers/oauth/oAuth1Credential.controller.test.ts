import nock from 'nock';
import Container from 'typedi';
import type { Response } from 'express';
import Csrf from 'csrf';
import { Cipher } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import { OAuth1CredentialController } from '@/controllers/oauth/oAuth1Credential.controller';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
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

describe('OAuth1CredentialController', () => {
	mockInstance(Logger);
	mockInstance(ExternalHooks);
	mockInstance(SecretsHelper);
	mockInstance(VariablesService, {
		getAllCached: async () => [],
	});
	const cipher = mockInstance(Cipher);
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
		type: 'oAuth1Api',
	});

	const controller = Container.get(OAuth1CredentialController);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('getAuthUri', () => {
		it('should throw a BadRequestError when credentialId is missing in the query', async () => {
			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ query: { id: '' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new BadRequestError('Required credential ID is missing'),
			);
		});

		it('should throw a NotFoundError when no matching credential is found for the user', async () => {
			sharedCredentialsRepository.findCredentialForUser.mockResolvedValueOnce(null);

			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ user, query: { id: '1' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new NotFoundError('Credential not found'),
			);
		});

		it('should return a valid auth URI', async () => {
			jest.spyOn(Csrf.prototype, 'secretSync').mockReturnValueOnce(csrfSecret);
			jest.spyOn(Csrf.prototype, 'create').mockReturnValueOnce('token');
			sharedCredentialsRepository.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});
			credentialsHelper.applyDefaultsAndOverwrites.mockReturnValueOnce({
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				signatureMethod: 'HMAC-SHA1',
			});
			nock('https://example.domain')
				.post('/oauth/request_token', {
					oauth_callback:
						'http://localhost:5678/rest/oauth1-credential/callback?state=eyJ0b2tlbiI6InRva2VuIiwiY2lkIjoiMSJ9',
				})
				.reply(200, { oauth_token: 'random-token' });
			cipher.encrypt.mockReturnValue('encrypted');

			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ user, query: { id: '1' } });
			const authUri = await controller.getAuthUri(req);
			expect(authUri).toEqual('https://example.domain/oauth/authorize?oauth_token=random-token');
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: 'encrypted',
					id: '1',
					name: 'Test Credential',
					type: 'oAuth1Api',
				}),
			);
			expect(cipher.encrypt).toHaveBeenCalledWith({ csrfSecret });
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
			const req = mock<OAuthRequest.OAuth1Credential.Callback>();
			const res = mock<Response>();
			req.query = { state: 'test' } as OAuthRequest.OAuth1Credential.Callback['query'];
			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Insufficient parameters for OAuth1 callback.',
					reason: 'Received following query parameters: {"state":"test"}',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('should render the error page when `state` query param is invalid', async () => {
			const req = mock<OAuthRequest.OAuth1Credential.Callback>();
			const res = mock<Response>();
			req.query = {
				oauth_verifier: 'verifier',
				oauth_token: 'token',
				state: 'test',
			} as OAuthRequest.OAuth1Credential.Callback['query'];
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

			const req = mock<OAuthRequest.OAuth1Credential.Callback>();
			const res = mock<Response>();
			req.query = {
				oauth_verifier: 'verifier',
				oauth_token: 'token',
				state: validState,
			} as OAuthRequest.OAuth1Credential.Callback['query'];
			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'OAuth1 callback failed because of insufficient permissions',
				},
			});
			expect(credentialsRepository.findOneBy).toHaveBeenCalledTimes(1);
			expect(credentialsRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
		});

		it('should render the error page when state differs from the stored state in the credential', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(new CredentialsEntity());
			credentialsHelper.getDecrypted.mockResolvedValue({ csrfSecret: 'invalid' });

			const req = mock<OAuthRequest.OAuth1Credential.Callback>();
			const res = mock<Response>();
			req.query = {
				oauth_verifier: 'verifier',
				oauth_token: 'token',
				state: validState,
			} as OAuthRequest.OAuth1Credential.Callback['query'];

			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth1 callback state is invalid!',
				},
			});
		});
	});
});
