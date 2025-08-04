'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const event_service_1 = require('@/events/event.service');
const public_api_key_service_1 = require('@/services/public-api-key.service');
const api_keys_controller_1 = require('../api-keys.controller');
describe('ApiKeysController', () => {
	const publicApiKeyService = (0, backend_test_utils_1.mockInstance)(
		public_api_key_service_1.PublicApiKeyService,
	);
	const eventService = (0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	const controller = di_1.Container.get(api_keys_controller_1.ApiKeysController);
	let req;
	beforeAll(() => {
		req = { user: { id: '123' } };
	});
	describe('createAPIKey', () => {
		it('should create and save an API key', async () => {
			const apiKeyData = {
				id: '123',
				userId: '123',
				label: 'My API Key',
				apiKey: 'apiKey123',
				createdAt: new Date(),
				scopes: ['user:create'],
			};
			const req = (0, jest_mock_extended_1.mock)({
				user: (0, jest_mock_extended_1.mock)({ id: '123' }),
			});
			publicApiKeyService.apiKeyHasValidScopesForRole.mockReturnValue(true);
			publicApiKeyService.createPublicApiKeyForUser.mockResolvedValue(apiKeyData);
			publicApiKeyService.redactApiKey.mockImplementation(() => '***123');
			const newApiKey = await controller.createApiKey(
				req,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
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
			const req = (0, jest_mock_extended_1.mock)({
				user: (0, jest_mock_extended_1.mock)({ id: '123' }),
			});
			publicApiKeyService.apiKeyHasValidScopesForRole.mockReturnValue(false);
			await expect(
				controller.createApiKey(
					req,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
				),
			).rejects.toThrowError();
		});
	});
	describe('updateApiKey', () => {
		it('should fail to update API key if user uses a scope not allow for its role', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: (0, jest_mock_extended_1.mock)({ id: '123' }),
			});
			publicApiKeyService.apiKeyHasValidScopesForRole.mockReturnValue(false);
			await expect(
				controller.updateApiKey(
					req,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
				),
			).rejects.toThrowError();
		});
	});
	describe('getAPIKeys', () => {
		it('should return the users api keys redacted', async () => {
			const apiKeyData = {
				id: '123',
				userId: '123',
				label: 'My API Key',
				apiKey: 'apiKey***',
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			publicApiKeyService.getRedactedApiKeysForUser.mockResolvedValue([
				{ ...apiKeyData, expiresAt: null },
			]);
			const apiKeys = await controller.getApiKeys(req);
			expect(apiKeys).toEqual([{ ...apiKeyData, expiresAt: null }]);
			expect(publicApiKeyService.getRedactedApiKeysForUser).toHaveBeenCalledWith(
				expect.objectContaining({ id: req.user.id }),
			);
		});
	});
	describe('deleteAPIKey', () => {
		it('should delete the API key', async () => {
			const user = (0, jest_mock_extended_1.mock)({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: 'global:member',
				mfaEnabled: false,
			});
			const req = (0, jest_mock_extended_1.mock)({ user, params: { id: user.id } });
			await controller.deleteApiKey(req, (0, jest_mock_extended_1.mock)(), user.id);
			publicApiKeyService.deleteApiKeyForUser.mockResolvedValue();
			expect(publicApiKeyService.deleteApiKeyForUser).toHaveBeenCalledWith(user, user.id);
			expect(eventService.emit).toHaveBeenCalledWith(
				'public-api-key-deleted',
				expect.objectContaining({ user, publicApi: false }),
			);
		});
	});
});
//# sourceMappingURL=api-keys.controller.test.js.map
