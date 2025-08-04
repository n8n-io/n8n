import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User, ApiKey } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { EventService } from '@/events/event.service';
import { PublicApiKeyService } from '@/services/public-api-key.service';

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
				apiKey: 'apiKey123',
				createdAt: new Date(),
				scopes: ['user:create'],
			} as ApiKey;

			const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: '123' }) });

			publicApiKeyService.apiKeyHasValidScopesForRole.mockReturnValue(true);

			publicApiKeyService.createPublicApiKeyForUser.mockResolvedValue(apiKeyData);

			publicApiKeyService.redactApiKey.mockImplementation(() => '***123');

			// Act

			const newApiKey = await controller.createApiKey(req, mock(), mock());

			// Assert

			expect(publicApiKeyService.createPublicApiKeyForUser).toHaveBeenCalled();
			expect(newApiKey).toEqual(
				expect.objectContaining({
					id: '123',
					userId: '123',
					label: 'My API Key',
					apiKey: '***123',
					createdAt: expect.any(Date),
					rawApiKey: 'apiKey123',
					scopes: ['user:create'],
				}),
			);
			expect(eventService.emit).toHaveBeenCalledWith(
				'public-api-key-created',
				expect.objectContaining({ user: req.user, publicApi: false }),
			);
		});

		it('should fail to create API key if user uses a scope not allow for its role', async () => {
			// Arrange

			const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: '123' }) });

			publicApiKeyService.apiKeyHasValidScopesForRole.mockReturnValue(false);

			// Act and Assert

			await expect(controller.createApiKey(req, mock(), mock())).rejects.toThrowError();
		});
	});

	describe('updateApiKey', () => {
		it('should fail to update API key if user uses a scope not allow for its role', async () => {
			// Arrange

			const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: '123' }) });

			publicApiKeyService.apiKeyHasValidScopesForRole.mockReturnValue(false);

			// Act and Assert

			await expect(controller.updateApiKey(req, mock(), mock(), mock())).rejects.toThrowError();
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

			publicApiKeyService.getRedactedApiKeysForUser.mockResolvedValue([
				{ ...apiKeyData, expiresAt: null },
			]);

			// Act

			const apiKeys = await controller.getApiKeys(req);

			// Assert

			expect(apiKeys).toEqual([{ ...apiKeyData, expiresAt: null }]);
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

			const req = mock<AuthenticatedRequest>({ user, params: { id: user.id } });

			// Act

			await controller.deleteApiKey(req, mock(), user.id);

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
