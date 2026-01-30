import { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { SecretsProviderConnectionRepository, SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsModule } from '@/modules/external-secrets.ee/external-secrets.module';
import { PubSubEventBus } from '@/scaling/pubsub/pubsub.eventbus';
import { PubSubRegistry } from '@/scaling/pubsub/pubsub.registry';

import {
	AnotherDummyProvider,
	DummyProvider,
	MockProviders,
} from '../../shared/external-secrets/utils';

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

const waitForEventHandler = async (ms = 500) => {
	await new Promise((resolve) => setTimeout(resolve, ms));
};

const testReloadEvent = async (pubsubEventBus: PubSubEventBus) => {
	const initSpy = jest.spyOn(DummyProvider.prototype, 'init');
	const connectSpy = jest.spyOn(DummyProvider.prototype, 'connect');
	const disconnectSpy = jest.spyOn(DummyProvider.prototype, 'disconnect');
	const updateSpy = jest.spyOn(DummyProvider.prototype, 'update');

	const initDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'init');
	const connectDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'connect');
	const disconnectDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'disconnect');
	const updateDisabledSpy = jest.spyOn(AnotherDummyProvider.prototype, 'update');

	// Emit event and wait for async handler to complete
	pubsubEventBus.emit('reload-external-secrets-providers');
	await waitForEventHandler();

	// load enabled provider
	expect(disconnectSpy).toHaveBeenCalled();
	expect(initSpy).toHaveBeenCalled();
	expect(connectSpy).toHaveBeenCalled();
	expect(updateSpy).toHaveBeenCalled();

	// init disabled provider
	expect(disconnectDisabledSpy).toHaveBeenCalled();
	expect(initDisabledSpy).toHaveBeenCalled();
	expect(connectDisabledSpy).not.toHaveBeenCalled();
	expect(updateDisabledSpy).not.toHaveBeenCalled();
};

describe('External Secrets Event Handling', () => {
	let pubsubEventBus: PubSubEventBus;
	let pubSubRegistry: PubSubRegistry;

	beforeAll(async () => {
		await testModules.loadModules(['external-secrets']);
		await testDb.init();

		Container.set(Logger, mockLogger());

		// Get pub/sub infrastructure from DI container
		pubsubEventBus = Container.get(PubSubEventBus);
		pubSubRegistry = Container.get(PubSubRegistry);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('using settings store', () => {
		let module: ExternalSecretsModule;

		beforeAll(async () => {
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				another_dummy: AnotherDummyProvider,
			});

			const config = Container.get(ExternalSecretsConfig);
			(config as any).externalSecretsForProjects = false;

			const settingsRepository = Container.get(SettingsRepository);
			const cipher = Container.get(Cipher);

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

			module = Container.get(ExternalSecretsModule);
			await module.init();

			// IMPORTANT: Initialize PubSubRegistry AFTER module.init() to wire up decorators
			pubSubRegistry.init();
		});

		afterAll(async () => {
			await module.shutdown();
		});

		it('should reload providers when reload-external-secrets-providers event is emitted', async () =>
			await testReloadEvent(pubsubEventBus));
	});

	describe('using providers connections', () => {
		let module: ExternalSecretsModule;

		beforeAll(async () => {
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				another_dummy: AnotherDummyProvider,
			});

			const config = Container.get(ExternalSecretsConfig);
			(config as any).externalSecretsForProjects = true;

			const cipher = Container.get(Cipher);
			const encryptedSettings = cipher.encrypt(JSON.stringify({}));

			const connectionRepository = Container.get(SecretsProviderConnectionRepository);
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

			module = Container.get(ExternalSecretsModule);
			await module.init();

			// IMPORTANT: Initialize PubSubRegistry AFTER module.init() to wire up decorators
			pubSubRegistry.init();
		});

		afterAll(async () => {
			await module.shutdown();
		});

		it('should reload providers when reload-external-secrets-providers event is emitted', async () =>
			await testReloadEvent(pubsubEventBus));
	});
});
