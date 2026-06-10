import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User, ApiKey } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { EventService } from '@/events/event.service';
import { PublicApiKeyService } from '@/services/public-api-key.service';
import { UrlService } from '@/services/url.service';
import { UserManagementMailer } from '@/user-management/email';

import { ApiKeysController } from '../api-keys.controller';

describe('ApiKeysController', () => {
	const publicApiKeyService = mockInstance(PublicApiKeyService);
	const eventService = mockInstance(EventService);
	const mailer = mockInstance(UserManagementMailer);
	const urlService = mockInstance(UrlService);

	const controller = Container.get(ApiKeysController);

	beforeEach(() => {
		urlService.getInstanceBaseUrl.mockReturnValue('https://acme.app.n8n.cloud');
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
		it('delegates to the service with the authenticated user, pagination, ownership, label, and sortBy', async () => {
			publicApiKeyService.getRedactedApiKeys.mockResolvedValue({
				items: [],
				counts: { mine: 0, all: 0 },
				totals: { mine: 0, all: 0 },
			});
			const req = mock<AuthenticatedRequest>({ user: mock<User>({ id: '123' }) });

			await controller.getApiKeys(req, mock(), {
				take: 10,
				skip: 5,
				ownership: 'mine',
				label: 'prod',
				sortBy: 'label:asc',
			} as never);

			expect(publicApiKeyService.getRedactedApiKeys).toHaveBeenCalledWith(req.user, {
				take: 10,
				skip: 5,
				ownership: 'mine',
				label: 'prod',
				sortBy: 'label:asc',
			});
		});
	});

	describe('deleteAPIKey', () => {
		const apiKey = mock<ApiKey>({
			id: 'key-1',
			label: 'Test 123',
			apiKey: 'n8n_api_xxxxxxxaaa5',
			userId: 'owner-1',
			user: mock<User>({
				id: 'owner-1',
				email: 'owner@example.com',
				firstName: 'Maria',
				lastName: 'Silva',
			}),
		});

		it('emits isOwn=true when the caller deletes their own key', async () => {
			const user = mock<User>({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: { slug: 'global:member' },
				mfaEnabled: false,
			});

			const req = mock<AuthenticatedRequest>({ user, params: { id: user.id } });

			publicApiKeyService.deleteApiKey.mockResolvedValue({ isOwn: true, apiKey });

			await controller.deleteApiKey(req, mock(), user.id);

			expect(publicApiKeyService.deleteApiKey).toHaveBeenCalledWith(user, user.id);
			expect(eventService.emit).toHaveBeenCalledWith('public-api-key-deleted', {
				user,
				publicApi: false,
				isOwn: true,
			});
			expect(mailer.apiKeyRevoked).not.toHaveBeenCalled();
		});

		it('emits isOwn=false when an admin deletes another user’s key', async () => {
			const admin = mock<User>({
				id: 'admin-1',
				role: { slug: 'global:admin' },
			});

			const req = mock<AuthenticatedRequest>({ user: admin, params: { id: 'key-of-other' } });

			publicApiKeyService.deleteApiKey.mockResolvedValue({ isOwn: false, apiKey });

			await controller.deleteApiKey(req, mock(), 'key-of-other');

			expect(eventService.emit).toHaveBeenCalledWith('public-api-key-deleted', {
				user: admin,
				publicApi: false,
				isOwn: false,
			});
		});

		it('notifies the key owner when an admin revokes their key', async () => {
			const admin = mock<User>({
				id: 'admin-1',
				firstName: 'Jan',
				lastName: 'Ostrówka',
				email: 'jan@acme.test',
				role: { slug: 'global:admin' },
			});

			const req = mock<AuthenticatedRequest>({ user: admin, params: { id: 'key-of-other' } });

			publicApiKeyService.deleteApiKey.mockResolvedValue({ isOwn: false, apiKey });

			await controller.deleteApiKey(req, mock(), 'key-of-other');

			expect(mailer.apiKeyRevoked).toHaveBeenCalledWith({
				email: 'owner@example.com',
				firstName: 'Maria',
				label: 'Test 123',
				suffix: 'aaa5',
				revokedBy: 'Jan Ostrówka',
				revokedAt: expect.stringMatching(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/),
				createApiKeyUrl: 'https://acme.app.n8n.cloud/settings/api',
			});
		});

		it('does not fail the request when sending the revocation email throws', async () => {
			const admin = mock<User>({
				id: 'admin-1',
				firstName: 'Jan',
				lastName: 'Ostrówka',
				email: 'jan@acme.test',
				role: { slug: 'global:admin' },
			});

			const req = mock<AuthenticatedRequest>({ user: admin, params: { id: 'key-of-other' } });

			publicApiKeyService.deleteApiKey.mockResolvedValue({ isOwn: false, apiKey });
			mailer.apiKeyRevoked.mockRejectedValueOnce(new Error('smtp down'));

			await expect(controller.deleteApiKey(req, mock(), 'key-of-other')).resolves.toEqual({
				success: true,
			});
		});
	});
});
