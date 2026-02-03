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

			const config = Container.get(ExternalSecretsConfig);
			config.externalSecretsForProjects = false;

			module = Container.get(ExternalSecretsModule);

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

		afterEach(async () => {
			await module.shutdown();
		});

		it('should load enabled providers on init', async () => {
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

		it('should disconnect providers after shutdown', async () => {
			await module.init();

			const disconnectSpy = jest.spyOn(DummyProvider.prototype, 'disconnect');
			await module.shutdown();

			expect(disconnectSpy).toHaveBeenCalled();
			disconnectSpy.mockRestore();
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

			const config = Container.get(ExternalSecretsConfig);
			config.externalSecretsForProjects = true;

			module = Container.get(ExternalSecretsModule);

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

		afterEach(async () => {
			await module.shutdown();
		});

		it('should load enabled providers on init', async () => {
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

		it('should disconnect providers after shutdown', async () => {
			await module.init();
			const disconnectSpy = jest.spyOn(DummyProvider.prototype, 'disconnect');

			await module.shutdown();

			expect(disconnectSpy).toHaveBeenCalled();
			disconnectSpy.mockRestore();
		});
	});
});
