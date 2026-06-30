import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User, ApiKey } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';
import { PublicApiKeyService } from '@/services/public-api-key.service';

import { ApiKeysController } from '../api-keys.controller';

describe('ApiKeysController', () => {
	const publicApiKeyService = mockInstance(PublicApiKeyService);
	const eventService = mockInstance(EventService);

	const controller = Container.get(ApiKeysController);

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

	describe('rotateApiKey', () => {
		it('rotates the key, returns the redacted and raw values, and emits the event', async () => {
			const apiKeyData = {
				id: '123',
				userId: '123',
				label: 'My API Key',
				apiKey: 'rotatedKey456',
				createdAt: new Date(),
				scopes: ['user:create'],
			} as ApiKey;

			const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: '123' }) });

			publicApiKeyService.rotateApiKey.mockResolvedValue(apiKeyData);
			publicApiKeyService.redactApiKey.mockImplementation(() => '***456');
			publicApiKeyService.getApiKeyExpiration.mockReturnValue(null);

			const rotatedApiKey = await controller.rotateApiKey(req, mock(), '123');

			expect(publicApiKeyService.rotateApiKey).toHaveBeenCalledWith(req.user, '123');
			expect(rotatedApiKey).toEqual(
				expect.objectContaining({
					id: '123',
					label: 'My API Key',
					apiKey: '***456',
					rawApiKey: 'rotatedKey456',
					expiresAt: null,
					scopes: ['user:create'],
				}),
			);
			expect(eventService.emit).toHaveBeenCalledWith('public-api-key-rotated', {
				user: req.user,
				publicApi: false,
			});
		});
	});

	describe('getAPIKeys', () => {
		it('delegates to the service with the authenticated user, pagination, ownership, label, ownerIds, and sortBy', async () => {
			publicApiKeyService.getRedactedApiKeys.mockResolvedValue({
				items: [],
				counts: { mine: 0, all: 0 },
				totals: { mine: 0, all: 0 },
				owners: [],
			});
			const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: '123' }) });

			await controller.getApiKeys(req, mock(), {
				take: 10,
				skip: 5,
				ownership: 'all',
				label: 'prod',
				ownerIds: ['u1', 'u2'],
				sortBy: 'label:asc',
			} as never);

			expect(publicApiKeyService.getRedactedApiKeys).toHaveBeenCalledWith(req.user, {
				take: 10,
				skip: 5,
				ownership: 'all',
				label: 'prod',
				ownerIds: ['u1', 'u2'],
				sortBy: 'label:asc',
			});
		});
	});

	describe('deleteAPIKey', () => {
		it('emits isOwn=true when the caller deletes their own key', async () => {
			const user = mock<User>({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: { slug: 'global:member' },
				mfaEnabled: false,
			});

			const req = mock<AuthenticatedRequest>({ user, params: { id: user.id } });

			publicApiKeyService.deleteApiKey.mockResolvedValue({ isOwn: true });

			await controller.deleteApiKey(req, mock(), user.id);

			expect(publicApiKeyService.deleteApiKey).toHaveBeenCalledWith(user, user.id);
			expect(eventService.emit).toHaveBeenCalledWith('public-api-key-deleted', {
				user,
				publicApi: false,
				isOwn: true,
			});
		});

		it('emits isOwn=false when an admin deletes another user’s key', async () => {
			const admin = mock<User>({
				id: 'admin-1',
				role: { slug: 'global:admin' },
			});

			const req = mock<AuthenticatedRequest>({ user: admin, params: { id: 'key-of-other' } });

			publicApiKeyService.deleteApiKey.mockResolvedValue({ isOwn: false });

			await controller.deleteApiKey(req, mock(), 'key-of-other');

			expect(eventService.emit).toHaveBeenCalledWith('public-api-key-deleted', {
				user: admin,
				publicApi: false,
				isOwn: false,
			});
		});
	});
});
