import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { ApiKey } from '@/databases/entities/api-key';
import type { User } from '@/databases/entities/user';
import { EventService } from '@/events/event.service';
import type { ApiKeysRequest, AuthenticatedRequest } from '@/requests';
import { PublicApiKeyService } from '@/services/public-api-key.service';
import { mockInstance } from '@test/mocking';

import { ApiKeysController } from '../api-keys.controller';

describe('ApiKeysController', () => {
	const publicApiKeyService = mockInstance(PublicApiKeyService);
	const eventService = mockInstance(EventService);
	const controller = Container.get(ApiKeysController);

	let req: AuthenticatedRequest;
	beforeAll(() => {
		req = { user: { id: '123' } } as AuthenticatedRequest;
	});

	describe('createAPIKey', () => {
		it('should create and save an API key', async () => {
			// Arrange

			const apiKeyData = {
				id: '123',
				userId: '123',
				label: 'My API Key',
				apiKey: 'apiKey********',
				createdAt: new Date(),
			} as ApiKey;

			const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: '123' }) });

			publicApiKeyService.createPublicApiKeyForUser.mockResolvedValue(apiKeyData);

			// Act

			const newApiKey = await controller.createAPIKey(req);

			// Assert

			expect(publicApiKeyService.createPublicApiKeyForUser).toHaveBeenCalled();
			expect(apiKeyData).toEqual(newApiKey);
			expect(eventService.emit).toHaveBeenCalledWith(
				'public-api-key-created',
				expect.objectContaining({ user: req.user, publicApi: false }),
			);
		});
	});

	describe('getAPIKeys', () => {
		it('should return the users api keys redacted', async () => {
			// Arrange

			const apiKeyData = {
				id: '123',
				userId: '123',
				label: 'My API Key',
				apiKey: 'apiKey***',
				createdAt: new Date(),
				updatedAt: new Date(),
			} as ApiKey;

			publicApiKeyService.getRedactedApiKeysForUser.mockResolvedValue([apiKeyData]);

			// Act

			const apiKeys = await controller.getAPIKeys(req);

			// Assert

			expect(apiKeys).toEqual([apiKeyData]);
			expect(publicApiKeyService.getRedactedApiKeysForUser).toHaveBeenCalledWith(
				expect.objectContaining({ id: req.user.id }),
			);
		});
	});

	describe('deleteAPIKey', () => {
		it('should delete the API key', async () => {
			// Arrange

			const user = mock<User>({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: 'global:member',
				mfaEnabled: false,
			});

			const req = mock<ApiKeysRequest.DeleteAPIKey>({ user, params: { id: user.id } });

			// Act

			await controller.deleteAPIKey(req);

			publicApiKeyService.deleteApiKeyForUser.mockResolvedValue();

			// Assert

			expect(publicApiKeyService.deleteApiKeyForUser).toHaveBeenCalledWith(user, user.id);
			expect(eventService.emit).toHaveBeenCalledWith(
				'public-api-key-deleted',
				expect.objectContaining({ user, publicApi: false }),
			);
		});
	});
});
