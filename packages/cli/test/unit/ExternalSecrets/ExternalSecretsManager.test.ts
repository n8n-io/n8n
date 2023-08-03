import type { SettingsRepository } from '@/databases/repositories';
import type { ExternalSecretsSettings } from '@/Interfaces';
import { License } from '@/License';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { ExternalSecretsProviders } from '@/ExternalSecrets/ExternalSecretsProviders.ee';
import { mock } from 'jest-mock-extended';
import { UserSettings } from 'n8n-core';
import Container from 'typedi';
import { mockInstance } from '../../integration/shared/utils';
import {
	DummyProvider,
	ErrorProvider,
	FailedProvider,
	MockProviders,
} from '../../shared/ExternalSecrets/utils';
import { AES, enc } from 'crypto-js';
import { InternalHooks } from '@/InternalHooks';

const connectedDate = '2023-08-01T12:32:29.000Z';
const encryptionKey = 'testkey';
let settings: string | null = null;
const mockProvidersInstance = new MockProviders();
const settingsRepo = mock<SettingsRepository>({
	async getEncryptedSecretsProviderSettings() {
		return settings;
	},
	async saveEncryptedSecretsProviderSettings(data) {
		settings = data;
	},
});
let licenseMock: License;
let providersMock: ExternalSecretsProviders;
let manager: ExternalSecretsManager | undefined;

const createMockSettings = (settings: ExternalSecretsSettings): string => {
	return AES.encrypt(JSON.stringify(settings), encryptionKey).toString();
};

const decryptSettings = (settings: string) => {
	return JSON.parse(AES.decrypt(settings ?? '', encryptionKey).toString(enc.Utf8));
};

describe('External Secrets Manager', () => {
	beforeAll(() => {
		jest
			.spyOn(UserSettings, 'getEncryptionKey')
			.mockReturnValue(new Promise((resolve) => resolve(encryptionKey)));
		providersMock = mockInstance(ExternalSecretsProviders, mockProvidersInstance);
		licenseMock = mockInstance(License, {
			isExternalSecretsEnabled() {
				return true;
			},
		});
		mockInstance(InternalHooks);
	});

	beforeEach(() => {
		mockProvidersInstance.setProviders({
			dummy: DummyProvider,
		});
		settings = createMockSettings({
			dummy: { connected: true, connectedAt: new Date(connectedDate), settings: {} },
		});

		Container.remove(ExternalSecretsManager);
	});

	afterEach(() => {
		manager?.shutdown();
		jest.useRealTimers();
	});

	test('should get secret', async () => {
		manager = new ExternalSecretsManager(settingsRepo, licenseMock, providersMock);

		await manager.init();

		expect(manager.getSecret('dummy', 'test1')).toBe('value1');
	});

	test('should not throw errors during init', async () => {
		mockProvidersInstance.setProviders({
			dummy: ErrorProvider,
		});
		manager = new ExternalSecretsManager(settingsRepo, licenseMock, providersMock);

		expect(async () => manager!.init()).not.toThrow();
	});

	test('should not throw errors during shutdown', async () => {
		mockProvidersInstance.setProviders({
			dummy: ErrorProvider,
		});
		manager = new ExternalSecretsManager(settingsRepo, licenseMock, providersMock);

		await manager.init();
		expect(() => manager!.shutdown()).not.toThrow();
		manager = undefined;
	});

	test('should save provider settings', async () => {
		manager = new ExternalSecretsManager(settingsRepo, licenseMock, providersMock);

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
		manager = new ExternalSecretsManager(settingsRepo, licenseMock, providersMock);

		await manager.init();

		const updateSpy = jest.spyOn(manager.getProvider('dummy')!, 'update');

		expect(updateSpy).toBeCalledTimes(0);

		jest.runOnlyPendingTimers();

		expect(updateSpy).toBeCalledTimes(1);
	});

	test('should not call provider update functions if the not licensed', async () => {
		jest.useFakeTimers();

		manager = new ExternalSecretsManager(
			settingsRepo,
			mock<License>({
				isExternalSecretsEnabled() {
					return false;
				},
			}),
			providersMock,
		);

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
		manager = new ExternalSecretsManager(settingsRepo, licenseMock, providersMock);

		await manager.init();

		const updateSpy = jest.spyOn(manager.getProvider('dummy')!, 'update');

		expect(updateSpy).toBeCalledTimes(0);

		jest.runOnlyPendingTimers();

		expect(updateSpy).toBeCalledTimes(0);
	});

	test('should reinitialize a provider when save provider settings', async () => {
		manager = new ExternalSecretsManager(settingsRepo, licenseMock, providersMock);

		await manager.init();

		const dummyInitSpy = jest.spyOn(DummyProvider.prototype, 'init');

		await manager.setProviderSettings('dummy', {
			test: 'value',
		});

		expect(dummyInitSpy).toBeCalledTimes(1);
	});
});
