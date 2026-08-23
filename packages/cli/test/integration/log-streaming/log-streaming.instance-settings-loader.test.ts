import { testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import { InstanceBootstrappingError } from '@/instance-settings-loader/instance-bootstrapping.error';
import { LogStreamingInstanceSettingsLoader } from '@/instance-settings-loader/loaders/log-streaming.instance-settings-loader';
import { EventDestinationsRepository } from '@/modules/log-streaming.ee/database/repositories/event-destination.repository';

beforeAll(async () => {
	await testModules.loadModules(['log-streaming']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('LogStreamingInstanceSettingsLoader → event_destinations roundtrip', () => {
	let originalConfig: Pick<
		InstanceSettingsLoaderConfig,
		'logStreamingManagedByEnv' | 'logStreamingDestinations'
	>;
	let repository: EventDestinationsRepository;
	let loader: LogStreamingInstanceSettingsLoader;

	const setConfig = (overrides: Partial<InstanceSettingsLoaderConfig>) => {
		Object.assign(Container.get(GlobalConfig).instanceSettingsLoader, {
			logStreamingManagedByEnv: true,
			logStreamingDestinations: '',
			...overrides,
		});
	};

	beforeEach(async () => {
		repository = Container.get(EventDestinationsRepository);
		loader = Container.get(LogStreamingInstanceSettingsLoader);

		const config = Container.get(GlobalConfig).instanceSettingsLoader;
		originalConfig = {
			logStreamingManagedByEnv: config.logStreamingManagedByEnv,
			logStreamingDestinations: config.logStreamingDestinations,
		};

		await repository.delete({});
	});

	afterEach(async () => {
		Object.assign(Container.get(GlobalConfig).instanceSettingsLoader, originalConfig);
		await repository.delete({});
	});

	it('returns "skipped" and does not touch the DB when the flag is off', async () => {
		setConfig({
			logStreamingManagedByEnv: false,
			logStreamingDestinations: JSON.stringify([
				{ type: 'webhook', label: 'Ignored', url: 'https://ignored.test' },
			]),
		});

		await expect(loader.run()).resolves.toBe('skipped');
		await expect(repository.count()).resolves.toBe(0);
	});

	it('persists every destination from the env JSON into the DB', async () => {
		setConfig({
			logStreamingDestinations: JSON.stringify([
				{
					type: 'webhook',
					label: 'Audit',
					url: 'https://hooks.example.com',
					method: 'POST',
				},
				{ type: 'syslog', label: 'SIEM', host: 'syslog.test', port: 514, protocol: 'tcp' },
				{ type: 'sentry', label: 'Errors', dsn: 'https://pub@sentry.test/1' },
			]),
		});

		await expect(loader.run()).resolves.toBe('created');

		const rows = await repository.find();
		const byLabel = Object.fromEntries(rows.map((row) => [row.destination.label, row.destination]));
		expect(byLabel).toEqual({
			Audit: expect.objectContaining({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://hooks.example.com',
				method: 'POST',
			}),
			SIEM: expect.objectContaining({
				__type: MessageEventBusDestinationTypeNames.syslog,
				host: 'syslog.test',
				port: 514,
				protocol: 'tcp',
			}),
			Errors: expect.objectContaining({
				__type: MessageEventBusDestinationTypeNames.sentry,
				dsn: 'https://pub@sentry.test/1',
			}),
		});
	});

	it('writes no rows when the env array is empty', async () => {
		setConfig({ logStreamingDestinations: '[]' });

		await loader.run();

		expect(await repository.count()).toBe(0);
	});

	it('throws InstanceBootstrappingError on invalid JSON without writing to the DB', async () => {
		setConfig({ logStreamingDestinations: '{not valid' });

		await expect(loader.run()).rejects.toThrow(InstanceBootstrappingError);
		expect(await repository.count()).toBe(0);
	});
});
