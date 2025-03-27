import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';

import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { ExternalSecretsManager } from '@/external-secrets.ee/external-secrets-manager.ee';
import { ExternalSecretsProviders } from '@/external-secrets.ee/external-secrets-providers.ee';
import type { ExternalSecretsSettings } from '@/interfaces';
import { License } from '@/license';
import {
	DummyProvider,
	ErrorProvider,
	FailedProvider,
	MockProviders,
} from '@test/external-secrets/utils';
import { mockInstance, mockLogger } from '@test/mocking';

describe('External Secrets Manager', () => {
	const connectedDate = '2023-08-01T12:32:29.000Z';
	let settings: string | null = null;

	const mockProvidersInstance = new MockProviders();
	const license = mockInstance(License);
	const settingsRepo = mockInstance(SettingsRepository);
	const cipher = Container.get(Cipher);

	let providersMock: ExternalSecretsProviders;
	let manager: ExternalSecretsManager;

	const createMockSettings = (settings: ExternalSecretsSettings): string => {
		return cipher.encrypt(settings);
	};

	const decryptSettings = (settings: string) => {
		return JSON.parse(cipher.decrypt(settings));
	};

	beforeAll(() => {
		providersMock = mockInstance(ExternalSecretsProviders, mockProvidersInstance);
		settings = createMockSettings({
			dummy: { connected: true, connectedAt: new Date(connectedDate), settings: {} },
		});
	});

	beforeEach(() => {
		mockProvidersInstance.setProviders({
			dummy: DummyProvider,
		});
		license.isExternalSecretsEnabled.mockReturnValue(true);
		settingsRepo.getEncryptedSecretsProviderSettings.mockResolvedValue(settings);
		manager = new ExternalSecretsManager(
			mockLogger(),
			settingsRepo,
			license,
			providersMock,
			cipher,
			mock(),
			mock(),
		);
	});

	afterEach(() => {
		manager?.shutdown();
		jest.useRealTimers();
	});

	test('should get secret', async () => {
		await manager.init();

		expect(manager.getSecret('dummy', 'test1')).toBe('value1');
	});

	test('should not throw errors during init', async () => {
		mockProvidersInstance.setProviders({
			dummy: ErrorProvider,
		});
		expect(async () => await manager!.init()).not.toThrow();
	});

	test('should not throw errors during shutdown', async () => {
		mockProvidersInstance.setProviders({
			dummy: ErrorProvider,
		});

		await manager.init();
		expect(() => manager!.shutdown()).not.toThrow();
	});

	test('should save provider settings', async () => {
		const settingsSpy = jest.spyOn(settingsRepo, 'saveEncryptedSecretsProviderSettings');

		await manager.init();

		await manager.setProviderSettings('dummy', {
			test: 'value',
		});

		expect(decryptSettings(settingsSpy.mock.calls[0][0])).toEqual({
			dummy: {
				connected: true,
				connectedAt: connectedDate,
				settings: {
					test: 'value',
				},
			},
		});
	});

	test('should call provider update functions on a timer', async () => {
		jest.useFakeTimers();
		await manager.init();

		const updateSpy = jest.spyOn(manager.getProvider('dummy')!, 'update');

		expect(updateSpy).toBeCalledTimes(0);

		jest.runOnlyPendingTimers();

		expect(updateSpy).toBeCalledTimes(1);
	});

	test('should not call provider update functions if the not licensed', async () => {
		jest.useFakeTimers();

		license.isExternalSecretsEnabled.mockReturnValue(false);

		await manager.init();

		const updateSpy = jest.spyOn(manager.getProvider('dummy')!, 'update');

		expect(updateSpy).toBeCalledTimes(0);

		jest.runOnlyPendingTimers();

		expect(updateSpy).toBeCalledTimes(0);
	});

	test('should not call provider update functions if the provider has an error', async () => {
		jest.useFakeTimers();

		mockProvidersInstance.setProviders({
			dummy: FailedProvider,
		});

		await manager.init();

		const updateSpy = jest.spyOn(manager.getProvider('dummy')!, 'update');

		expect(updateSpy).toBeCalledTimes(0);

		jest.runOnlyPendingTimers();

		expect(updateSpy).toBeCalledTimes(0);
	});

	test('should reinitialize a provider when save provider settings', async () => {
		await manager.init();

		const dummyInitSpy = jest.spyOn(DummyProvider.prototype, 'init');

		await manager.setProviderSettings('dummy', {
			test: 'value',
		});

		expect(dummyInitSpy).toBeCalledTimes(1);
	});
});
