import { mock } from 'jest-mock-extended';
import { randomString } from 'n8n-workflow';
import { Container } from 'typedi';

import type { ApiKey } from '@/databases/entities/api-key';
import type { User } from '@/databases/entities/user';
import { ApiKeyRepository } from '@/databases/repositories/api-key.repository';
import type { ApiKeysRequest, AuthenticatedRequest } from '@/requests';
import { API_KEY_PREFIX } from '@/services/public-api-key.service';
import { mockInstance } from '@test/mocking';

import { ApiKeysController } from '../api-keys.controller';

describe('ApiKeysController', () => {
	const apiKeysRepository = mockInstance(ApiKeyRepository);
	const controller = Container.get(ApiKeysController);

	let req: AuthenticatedRequest;
	beforeAll(() => {
		req = mock<AuthenticatedRequest>({ user: mock<User>({ id: '123' }) });
	});

	describe('createAPIKey', () => {
		it('should create and save an API key', async () => {
			const apiKeyData = {
				id: '123',
				userId: '123',
				label: 'My API Key',
				apiKey: `${API_KEY_PREFIX}${randomString(42)}`,
				createdAt: new Date(),
			} as ApiKey;

			apiKeysRepository.upsert.mockImplementation();

			apiKeysRepository.findOneByOrFail.mockResolvedValue(apiKeyData);

			const newApiKey = await controller.createAPIKey(req);

			expect(apiKeysRepository.upsert).toHaveBeenCalled();
			expect(apiKeyData).toEqual(newApiKey);
		});
	});

	describe('getAPIKeys', () => {
		it('should return the users api keys redacted', async () => {
			const apiKeyData = {
				id: '123',
				userId: '123',
				label: 'My API Key',
				apiKey: `${API_KEY_PREFIX}${randomString(42)}`,
				createdAt: new Date(),
			} as ApiKey;

			apiKeysRepository.findBy.mockResolvedValue([apiKeyData]);

			const apiKeys = await controller.getAPIKeys(req);
			expect(apiKeys[0].apiKey).not.toEqual(apiKeyData.apiKey);
			expect(apiKeysRepository.findBy).toHaveBeenCalledWith({ userId: req.user.id });
		});
	});

	describe('deleteAPIKey', () => {
		it('should delete the API key', async () => {
			const user = mock<User>({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: 'global:member',
				mfaEnabled: false,
			});
			const req = mock<ApiKeysRequest.DeleteAPIKey>({ user, params: { id: user.id } });
			await controller.deleteAPIKey(req);
			expect(apiKeysRepository.delete).toHaveBeenCalledWith({
				userId: req.user.id,
				id: req.params.id,
			});
		});
	});
});
