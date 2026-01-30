import { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { SecretsProviderConnectionRepository, SettingsRepository } from '@n8n/db';
import { ShutdownMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsModule } from '@/modules/external-secrets.ee/external-secrets.module';

import {
	AnotherDummyProvider,
	DummyProvider,
	MockProviders,
} from '../../shared/external-secrets/utils';

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

describe('ExternalSecretsModule', () => {
	let config: ExternalSecretsConfig;

	beforeAll(async () => {
		await testModules.loadModules(['external-secrets']);
		await testDb.init();

		Container.set(Logger, mockLogger());
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('decorator verification', () => {
		it('should have shutdown method decorated with @OnShutdown', () => {
			const shutdownMetadata = Container.get(ShutdownMetadata);
			const handlers = shutdownMetadata.getHandlersByPriority().flat();

			const hasShutdownHandler = handlers.some(
				(handler) =>
					handler.serviceClass.name === 'ExternalSecretsModule' &&
					handler.methodName === 'shutdown',
			);

			expect(hasShutdownHandler).toBe(true);
		});
	});

	describe('using settings store', () => {
		let module: ExternalSecretsModule;

		beforeAll(async () => {
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				another_dummy: AnotherDummyProvider,
			});

			const settingsRepository = Container.get(SettingsRepository);
			const cipher = Container.get(Cipher);
			config = Container.get(ExternalSecretsConfig);
			module = Container.get(ExternalSecretsModule);

			(config as any).externalSecretsForProjects = false;

			const settings = {
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
				another_dummy: {
					connected: false,
					connectedAt: new Date(),
					settings: {},
				},
			};

			await settingsRepository.save({
				key: 'feature.externalSecrets',
				value: cipher.encrypt(settings),
				loadOnStartup: false,
			});
		});

		describe('init', () => {
			afterEach(async () => {
				await module.shutdown();
			});

			it('should load enabled providers', async () => {
				const initSpy = jest.spyOn(DummyProvider.prototype, 'init');
				const connectSpy = jest.spyOn(DummyProvider.prototype, 'connect');
				const updateSpy = jest.spyOn(DummyProvider.prototype, 'update');

				const initDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'init');
				const connectDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'connect');
				const updateDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'update');

				await module.init();

				expect(initSpy).toHaveBeenCalled();
				expect(connectSpy).toHaveBeenCalled();
				expect(updateSpy).toHaveBeenCalled();

				expect(initDisabledSpy).toHaveBeenCalled();
				expect(connectDisabledSpy).not.toHaveBeenCalled();
				expect(updateDisabledSpy).not.toHaveBeenCalled();

				initSpy.mockRestore();
				connectSpy.mockRestore();
				updateSpy.mockRestore();

				initDisabledSpy.mockRestore();
				connectDisabledSpy.mockRestore();
				updateDisabledSpy.mockRestore();
			});

			it('should start secrets refresh interval', async () => {
				jest.useFakeTimers();

				await module.init();

				const updateSpy = jest.spyOn(DummyProvider.prototype, 'update');

				jest.advanceTimersByTime(config.updateInterval * 1000);

				expect(updateSpy).toHaveBeenCalled();
				updateSpy.mockRestore();

				jest.useRealTimers();
			});
		});

		describe('shutdown', () => {
			beforeEach(async () => {
				await module.init();
			});

			it('should disconnect providers after shutdown', async () => {
				const disconnectSpy = jest.spyOn(DummyProvider.prototype, 'disconnect');

				await module.shutdown();

				expect(disconnectSpy).toHaveBeenCalled();
				disconnectSpy.mockRestore();
			});

			it('should stop refresh after shutdown', async () => {
				jest.useFakeTimers();

				const updateSpy = jest.spyOn(DummyProvider.prototype, 'update');

				await module.shutdown();

				jest.advanceTimersByTime(config.updateInterval * 1000 * 2);
				expect(updateSpy).not.toHaveBeenCalled();

				updateSpy.mockRestore();
				jest.useRealTimers();
			});
		});
	});

	describe('using provider connections entities', () => {
		let connectionRepository: SecretsProviderConnectionRepository;
		let cipher: Cipher;
		let module: ExternalSecretsModule;

		beforeAll(async () => {
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				another_dummy: AnotherDummyProvider,
			});

			connectionRepository = Container.get(SecretsProviderConnectionRepository);
			cipher = Container.get(Cipher);
			config = Container.get(ExternalSecretsConfig);
			module = Container.get(ExternalSecretsModule);

			(config as any).externalSecretsForProjects = true;

			const encryptedSettings = cipher.encrypt(JSON.stringify({}));
			await connectionRepository.save({
				providerKey: 'my-vault',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});

			await connectionRepository.save({
				providerKey: 'another-vault',
				type: 'another_dummy',
				encryptedSettings,
				isEnabled: false,
			});
		});

		describe('init', () => {
			afterEach(async () => {
				await module.shutdown();
			});

			it('should load enabled providers', async () => {
				const initSpy = jest.spyOn(DummyProvider.prototype, 'init');
				const connectSpy = jest.spyOn(DummyProvider.prototype, 'connect');
				const updateSpy = jest.spyOn(DummyProvider.prototype, 'update');

				const initDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'init');
				const connectDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'connect');
				const updateDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'update');

				await module.init();

				expect(initSpy).toHaveBeenCalled();
				expect(connectSpy).toHaveBeenCalled();
				expect(updateSpy).toHaveBeenCalled();

				expect(initDisabledSpy).toHaveBeenCalled();
				expect(connectDisabledSpy).not.toHaveBeenCalled();
				expect(updateDisabledSpy).not.toHaveBeenCalled();

				initSpy.mockRestore();
				connectSpy.mockRestore();
				updateSpy.mockRestore();

				initDisabledSpy.mockRestore();
				connectDisabledSpy.mockRestore();
				updateDisabledSpy.mockRestore();
			});

			it('should start secrets refresh interval', async () => {
				jest.useFakeTimers();

				await module.init();

				const updateSpy = jest.spyOn(DummyProvider.prototype, 'update');

				jest.advanceTimersByTime(config.updateInterval * 1000);

				expect(updateSpy).toHaveBeenCalled();
				updateSpy.mockRestore();

				jest.useRealTimers();
			});
		});

		describe('shutdown', () => {
			beforeEach(async () => {
				await module.init();
			});

			it('should disconnect providers after shutdown', async () => {
				const disconnectSpy = jest.spyOn(DummyProvider.prototype, 'disconnect');

				await module.shutdown();

				expect(disconnectSpy).toHaveBeenCalled();
				disconnectSpy.mockRestore();
			});

			it('should stop refresh after shutdown', async () => {
				jest.useFakeTimers();

				const updateSpy = jest.spyOn(DummyProvider.prototype, 'update');

				await module.shutdown();

				jest.advanceTimersByTime(config.updateInterval * 1000 * 2);
				expect(updateSpy).not.toHaveBeenCalled();

				updateSpy.mockRestore();
				jest.useRealTimers();
			});
		});
	});
});
