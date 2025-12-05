import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import type { CredentialsEntity, User } from '@n8n/db';
import { CredentialsRepository, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import Csrf from 'csrf';
import type { Response } from 'express';
import { captor, mock } from 'jest-mock-extended';
import { Cipher, type InstanceSettings, ExternalSecretsProxy } from 'n8n-core';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import nock from 'nock';

import { OAuth1CredentialController } from '@/controllers/oauth/oauth1-credential.controller';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsHelper } from '@/credentials-helper';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExternalHooks } from '@/external-hooks';
import type { OAuthRequest } from '@/requests';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

jest.mock('@/workflow-execute-additional-data');

describe('OAuth1CredentialController', () => {
	mockInstance(Logger);
	mockInstance(ExternalHooks);
	mockInstance(ExternalSecretsProxy);
	mockInstance(VariablesService, {
		getAllCached: async () => [],
	});
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	(WorkflowExecuteAdditionalData.getBase as jest.Mock).mockReturnValue(additionalData);

	const cipher = new Cipher(mock<InstanceSettings>({ encryptionKey: 'password' }));
	Container.set(Cipher, cipher);
	const credentialsHelper = mockInstance(CredentialsHelper);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const credentialsFinderService = mockInstance(CredentialsFinderService);

	const csrfSecret = 'csrf-secret';
	const user = mock<User>({
		id: '123',
		password: 'password',
		authIdentities: [],
		role: GLOBAL_OWNER_ROLE,
	});
	const credential = mock<CredentialsEntity>({
		id: '1',
		name: 'Test Credential',
		type: 'oAuth1Api',
		data: cipher.encrypt({}),
	});

	const controller = Container.get(OAuth1CredentialController);

	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });

	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();
	});

	describe('getAuthUri', () => {
		it('should throw a BadRequestError when credentialId is missing in the query', async () => {
			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ query: { id: '' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new BadRequestError('Required credential ID is missing'),
			);
		});

		it('should throw a NotFoundError when no matching credential is found for the user', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(null);

			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ user, query: { id: '1' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new NotFoundError('Credential not found'),
			);
		});

		it('should return a valid auth URI', async () => {
			jest.spyOn(Csrf.prototype, 'secretSync').mockReturnValueOnce(csrfSecret);
			jest.spyOn(Csrf.prototype, 'create').mockReturnValueOnce('token');
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			});
			nock('https://example.domain')
				.post('/oauth/request_token', {
					oauth_callback:
						'http://localhost:5678/rest/oauth1-credential/callback?state=eyJ0b2tlbiI6InRva2VuIiwiY2lkIjoiMSIsImNyZWF0ZWRBdCI6MTcwNjc1MDYyNTY3OCwidXNlcklkIjoiMTIzIn0=',
				})
				.once()
				.reply(200, { oauth_token: 'random-token' });

			const req = mock<OAuthRequest.OAuth1Credential.Auth>({ user, query: { id: '1' } });
			const authUri = await controller.getAuthUri(req);
			expect(authUri).toEqual('https://example.domain/oauth/authorize?oauth_token=random-token');
			const dataCaptor = captor();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth1Api',
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

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Insufficient parameters for OAuth1 callback.',
					reason: 'Received following query parameters: {"state":"test"}',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('should render the error page when `state` query param is invalid', async () => {
			const invalidReq = mock<OAuthRequest.OAuth1Credential.Callback>({
				query: {
					oauth_verifier: 'verifier',
					oauth_token: 'token',
					state: 'test',
				},
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

		it('should render the error page when state differs from the stored state in the credential', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(credential);
			credentialsHelper.getDecrypted.mockResolvedValue({ csrfSecret: 'invalid' });

			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth callback state is invalid!',
				},
			});
		});

		it('should render the error page when state is older than 5 minutes', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(credential);
			credentialsHelper.getDecrypted.mockResolvedValue({ csrfSecret });
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);

			jest.advanceTimersByTime(10 * Time.minutes.toMilliseconds);

			await controller.handleCallback(req, res);

			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth callback state is invalid!',
				},
			});
		});

		it('should exchange the code for a valid token, and save it to DB', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(credential);
			credentialsHelper.getDecrypted.mockResolvedValue({ csrfSecret });
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			});
			jest.spyOn(Csrf.prototype, 'verify').mockReturnValueOnce(true);
			nock('https://example.domain')
				.post('/oauth/access_token', 'oauth_token=token&oauth_verifier=verifier')
				.once()
				.reply(200, 'access_token=new_token');

			await controller.handleCallback(req, res);
			const dataCaptor = captor();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth1Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({ oauthTokenData: { access_token: 'new_token' } }),
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
	});
});
