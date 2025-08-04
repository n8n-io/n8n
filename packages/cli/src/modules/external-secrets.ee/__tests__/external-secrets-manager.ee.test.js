'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const utils_1 = require('@test/external-secrets/utils');
const mocking_1 = require('@test/mocking');
const constants_1 = require('../constants');
const external_secrets_manager_ee_1 = require('../external-secrets-manager.ee');
describe('External Secrets Manager', () => {
	jest.useFakeTimers();
	const connectedDate = '2023-08-01T12:32:29.000Z';
	const providerSettings = () => ({
		connected: true,
		connectedAt: new Date(connectedDate),
		settings: {},
	});
	const settings = {
		dummy: providerSettings(),
		another_dummy: providerSettings(),
		failed: providerSettings(),
	};
	const mockProvidersInstance = new utils_1.MockProviders();
	const license = (0, jest_mock_extended_1.mock)();
	const settingsRepo = (0, jest_mock_extended_1.mock)();
	const cipher = (0, mocking_1.mockCipher)();
	let manager;
	beforeEach(() => {
		settings.dummy.connected = true;
		mockProvidersInstance.setProviders({
			dummy: utils_1.DummyProvider,
		});
		license.isExternalSecretsEnabled.mockReturnValue(true);
		settingsRepo.findByKey
			.calledWith(constants_1.EXTERNAL_SECRETS_DB_KEY)
			.mockImplementation(async () =>
				(0, jest_mock_extended_1.mock)({ value: JSON.stringify(settings) }),
			);
		manager = new external_secrets_manager_ee_1.ExternalSecretsManager(
			(0, backend_test_utils_1.mockLogger)(),
			(0, jest_mock_extended_1.mock)(),
			settingsRepo,
			license,
			mockProvidersInstance,
			cipher,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
	});
	afterEach(() => {
		manager?.shutdown();
	});
	describe('init / shutdown', () => {
		test('should not throw errors during init', async () => {
			mockProvidersInstance.setProviders({
				dummy: utils_1.ErrorProvider,
			});
			expect(async () => await manager.init()).not.toThrow();
		});
		test('should not throw errors during shutdown', async () => {
			mockProvidersInstance.setProviders({
				dummy: utils_1.ErrorProvider,
			});
			await manager.init();
			expect(() => manager.shutdown()).not.toThrow();
		});
		test('should call provider update functions on a timer', async () => {
			await manager.init();
			const updateSpy = jest.spyOn(manager.getProvider('dummy'), 'update');
			expect(updateSpy).toBeCalledTimes(0);
			jest.runOnlyPendingTimers();
			expect(updateSpy).toBeCalledTimes(1);
		});
		test('should not call provider update functions if the not licensed', async () => {
			license.isExternalSecretsEnabled.mockReturnValue(false);
			await manager.init();
			const updateSpy = jest.spyOn(manager.getProvider('dummy'), 'update');
			expect(updateSpy).toBeCalledTimes(0);
			jest.runOnlyPendingTimers();
			expect(updateSpy).toBeCalledTimes(0);
		});
		test('should not call provider update functions if the provider has an error', async () => {
			mockProvidersInstance.setProviders({
				dummy: utils_1.FailedProvider,
			});
			await manager.init();
			const updateSpy = jest.spyOn(manager.getProvider('dummy'), 'update');
			expect(updateSpy).toBeCalledTimes(0);
			jest.runOnlyPendingTimers();
			expect(updateSpy).toBeCalledTimes(0);
		});
		test('should reinitialize a provider when save provider settings', async () => {
			await manager.init();
			const dummyInitSpy = jest.spyOn(utils_1.DummyProvider.prototype, 'init');
			await manager.setProviderSettings('dummy', {
				test: 'value',
			});
			expect(dummyInitSpy).toBeCalledTimes(1);
		});
	});
	describe('hasProvider', () => {
		test('should check if provider exists', async () => {
			await manager.init();
			expect(manager.hasProvider('dummy')).toBe(true);
			expect(manager.hasProvider('nonexistent')).toBe(false);
		});
	});
	describe('getProviderNames', () => {
		test('should get provider names', async () => {
			await manager.init();
			expect(manager.getProviderNames()).toEqual(['dummy']);
			manager.providers = {};
			expect(manager.getProviderNames()).toEqual([]);
		});
	});
	describe('updateProvider', () => {
		test('should update a specific provider and return true on success', async () => {
			await manager.init();
			const result = await manager.updateProvider('dummy');
			expect(result).toBe(true);
		});
		test('should return false if provider is not connected', async () => {
			mockProvidersInstance.setProviders({
				dummy: utils_1.ErrorProvider,
			});
			await manager.init();
			const result = await manager.updateProvider('dummy');
			expect(result).toBe(false);
		});
		test('should return false if external secrets are not licensed', async () => {
			license.isExternalSecretsEnabled.mockReturnValue(false);
			await manager.init();
			const result = await manager.updateProvider('dummy');
			expect(result).toBe(false);
		});
	});
	describe('reloadAllProviders', () => {
		test('should reload all providers', async () => {
			await manager.init();
			const reloadSpy = jest.spyOn(manager, 'reloadProvider');
			await manager.reloadAllProviders();
			expect(reloadSpy).toHaveBeenCalledWith('dummy', undefined);
		});
	});
	describe('getProviderWithSettings', () => {
		test('should get provider with settings', async () => {
			await manager.init();
			const result = manager.getProviderWithSettings('dummy');
			expect(result).toEqual({
				provider: expect.any(utils_1.DummyProvider),
				settings: expect.objectContaining({
					connected: true,
					connectedAt: connectedDate,
				}),
			});
		});
	});
	describe('getProvidersWithSettings', () => {
		test('should return all providers with their settings', async () => {
			mockProvidersInstance.setProviders({
				dummy: utils_1.DummyProvider,
				another_dummy: utils_1.DummyProvider,
			});
			settings.dummy.settings = { key: 'value' };
			settings.another_dummy.settings = { key2: 'value2' };
			await manager.init();
			const result = manager.getProvidersWithSettings();
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				provider: expect.any(utils_1.DummyProvider),
				settings: expect.objectContaining({
					connected: true,
					settings: { key: 'value' },
				}),
			});
			expect(result[1]).toEqual({
				provider: expect.any(utils_1.DummyProvider),
				settings: expect.objectContaining({
					connected: true,
					settings: { key2: 'value2' },
				}),
			});
		});
	});
	describe('setProviderSettings', () => {
		test('should save provider settings', async () => {
			const settingsSpy = jest.spyOn(settingsRepo, 'upsert');
			await manager.init();
			await manager.setProviderSettings('dummy', {
				test: 'value',
			});
			const settingsCaptor = (0, jest_mock_extended_1.captor)();
			expect(settingsSpy).toHaveBeenCalledWith(settingsCaptor, ['key']);
			expect(JSON.parse(settingsCaptor.value.value)).toEqual(
				expect.objectContaining({
					dummy: {
						connected: true,
						connectedAt: connectedDate,
						settings: {
							test: 'value',
						},
					},
				}),
			);
		});
	});
	describe('testProviderSettings', () => {
		test('should test provider settings successfully', async () => {
			await manager.init();
			const result = await manager.testProviderSettings('dummy', {});
			expect(result).toEqual({
				success: true,
				testState: 'connected',
			});
		});
		test('should return tested state for successful but not connected provider', async () => {
			settings.dummy.connected = false;
			await manager.init();
			const result = await manager.testProviderSettings('dummy', {});
			expect(result).toEqual({
				success: true,
				testState: 'tested',
			});
		});
		test('should return error state if provider test fails', async () => {
			mockProvidersInstance.setProviders({
				error: utils_1.ErrorProvider,
			});
			await manager.init();
			const result = await manager.testProviderSettings('error', {});
			expect(result).toEqual({
				success: false,
				testState: 'error',
			});
		});
	});
	describe('hasSecret', () => {
		test('should return true when secret exists', async () => {
			await manager.init();
			expect(manager.hasSecret('dummy', 'test1')).toBe(true);
		});
		test('should return false when secret does not exist', async () => {
			await manager.init();
			expect(manager.hasSecret('dummy', 'nonexistent')).toBe(false);
		});
		test('should return false when provider does not exist', async () => {
			await manager.init();
			expect(manager.hasSecret('nonexistent', 'test1')).toBe(false);
		});
	});
	describe('getSecret', () => {
		test('should get secret', async () => {
			await manager.init();
			expect(manager.getSecret('dummy', 'test1')).toBe('value1');
		});
	});
	describe('getSecretNames', () => {
		test('should return list of secret names for a provider', async () => {
			await manager.init();
			expect(manager.getSecretNames('dummy')).toEqual(['test1', 'test2']);
		});
		test('should return an empty array when provider does not exist', async () => {
			await manager.init();
			expect(manager.getSecretNames('nonexistent')).toBeEmptyArray();
		});
	});
	describe('getAllSecretNames', () => {
		test('should return secret names for all providers', async () => {
			mockProvidersInstance.setProviders({
				dummy: utils_1.DummyProvider,
				another_dummy: utils_1.AnotherDummyProvider,
			});
			await manager.init();
			expect(manager.getAllSecretNames()).toEqual({
				dummy: ['test1', 'test2'],
				another_dummy: ['test1', 'test2'],
			});
		});
	});
});
//# sourceMappingURL=external-secrets-manager.ee.test.js.map
