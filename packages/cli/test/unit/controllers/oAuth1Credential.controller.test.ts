import nock from 'nock';
import Container from 'typedi';
import { Cipher } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import { OAuth1CredentialController } from '@/controllers/oauth/oAuth1Credential.controller';
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

import { mockInstance } from '../../shared/mocking';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

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
			sharedCredentialsRepository.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});
			credentialsHelper.applyDefaultsAndOverwrites.mockReturnValueOnce({
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				signatureMethod: 'HMAC-SHA1',
			});
			nock('https://example.domain')
				.post('/oauth/request_token', {
					oauth_callback: 'http://localhost:5678/rest/oauth1-credential/callback?cid=1',
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
		});
	});
});
