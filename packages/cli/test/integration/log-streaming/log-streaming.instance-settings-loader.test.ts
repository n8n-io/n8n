import { testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import { InstanceBootstrappingError } from '@/instance-settings-loader/instance-bootstrapping.error';
import { LogStreamingInstanceSettingsLoader } from '@/instance-settings-loader/loaders/log-streaming.instance-settings-loader';
import { EventDestinationsRepository } from '@/modules/log-streaming.ee/database/repositories/event-destination.repository';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

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

	it('persists a webhook destination from env on an empty DB', async () => {
		setConfig({
			logStreamingDestinations: JSON.stringify([
				{
					type: 'webhook',
					label: 'Audit',
					url: 'https://hooks.example.com',
					method: 'POST',
				},
			]),
		});

		await expect(loader.run()).resolves.toBe('created');

		const rows = await repository.find();
		expect(rows).toHaveLength(1);
		expect(rows[0].destination).toMatchObject({
			__type: MessageEventBusDestinationTypeNames.webhook,
			id: rows[0].id,
			label: 'Audit',
			url: 'https://hooks.example.com',
			method: 'POST',
		});
	});

	it('updates an existing row in place when id matches (idempotent re-run)', async () => {
		setConfig({
			logStreamingDestinations: JSON.stringify([
				{ type: 'webhook', id: UUID_A, label: 'V1', url: 'https://v1.test' },
			]),
		});
		await loader.run();

		const firstRows = await repository.find();
		expect(firstRows).toHaveLength(1);
		expect(firstRows[0].id).toBe(UUID_A);

		setConfig({
			logStreamingDestinations: JSON.stringify([
				{ type: 'webhook', id: UUID_A, label: 'V2', url: 'https://v2.test' },
			]),
		});
		await loader.run();

		const secondRows = await repository.find();
		expect(secondRows).toHaveLength(1);
		expect(secondRows[0].id).toBe(UUID_A);
		expect(secondRows[0].destination).toMatchObject({
			label: 'V2',
			url: 'https://v2.test',
		});
	});

	it('matches on (type, label) when id is absent, preserving the existing id', async () => {
		setConfig({
			logStreamingDestinations: JSON.stringify([
				{ type: 'syslog', label: 'SIEM', host: 'initial.host' },
			]),
		});
		await loader.run();

		const [initial] = await repository.find();
		const initialId = initial.id;

		setConfig({
			logStreamingDestinations: JSON.stringify([
				{ type: 'syslog', label: 'SIEM', host: 'updated.host', port: 514, protocol: 'tcp' },
			]),
		});
		await loader.run();

		const rows = await repository.find();
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(initialId);
		expect(rows[0].destination).toMatchObject({
			__type: MessageEventBusDestinationTypeNames.syslog,
			label: 'SIEM',
			host: 'updated.host',
			port: 514,
			protocol: 'tcp',
		});
	});

	it('deletes rows not referenced by the env array', async () => {
		setConfig({
			logStreamingDestinations: JSON.stringify([
				{ type: 'webhook', id: UUID_A, label: 'Keep', url: 'https://keep.test' },
				{ type: 'sentry', id: UUID_B, label: 'Drop', dsn: 'https://pub@sentry.test/1' },
			]),
		});
		await loader.run();
		expect(await repository.count()).toBe(2);

		setConfig({
			logStreamingDestinations: JSON.stringify([
				{ type: 'webhook', id: UUID_A, label: 'Keep', url: 'https://keep.test' },
			]),
		});
		await loader.run();

		const rows = await repository.find();
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(UUID_A);
	});

	it('clears all rows when the env array is empty', async () => {
		setConfig({
			logStreamingDestinations: JSON.stringify([
				{ type: 'webhook', id: UUID_A, label: 'A', url: 'https://a.test' },
			]),
		});
		await loader.run();
		expect(await repository.count()).toBe(1);

		setConfig({ logStreamingDestinations: '[]' });
		await loader.run();

		expect(await repository.count()).toBe(0);
	});

	it('persists all three destination types with the correct __type discriminator', async () => {
		setConfig({
			logStreamingDestinations: JSON.stringify([
				{ type: 'webhook', label: 'W', url: 'https://w.test' },
				{ type: 'syslog', label: 'S', host: 'syslog.test' },
				{ type: 'sentry', label: 'E', dsn: 'https://pub@sentry.test/1' },
			]),
		});

		await loader.run();

		const rows = await repository.find();
		const typesByLabel = Object.fromEntries(
			rows.map((row) => [row.destination.label, row.destination.__type]),
		);
		expect(typesByLabel).toEqual({
			W: MessageEventBusDestinationTypeNames.webhook,
			S: MessageEventBusDestinationTypeNames.syslog,
			E: MessageEventBusDestinationTypeNames.sentry,
		});
	});

	it('throws InstanceBootstrappingError on invalid JSON without writing to the DB', async () => {
		setConfig({ logStreamingDestinations: '{not valid' });

		await expect(loader.run()).rejects.toThrow(InstanceBootstrappingError);
		expect(await repository.count()).toBe(0);
	});
});
