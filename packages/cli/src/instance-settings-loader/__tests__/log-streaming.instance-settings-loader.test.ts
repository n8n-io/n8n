import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import type { EventDestinationsRepository } from '@/modules/log-streaming.ee/database/repositories/event-destination.repository';

import { InstanceBootstrappingError } from '../instance-bootstrapping.error';
import { LogStreamingInstanceSettingsLoader } from '../loaders/log-streaming.instance-settings-loader';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('LogStreamingInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const repository = mock<EventDestinationsRepository>();
	const tx = mock<EntityManager>();

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			logStreamingManagedByEnv: true,
			logStreamingDestinations: '',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new LogStreamingInstanceSettingsLoader(config, repository, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		// wire the transaction callback to run against our mock EntityManager
		(repository.manager as unknown as { transaction: jest.Mock }) = {
			transaction: jest.fn(async (cb: (m: EntityManager) => Promise<void>) => {
				await cb(tx);
			}),
		};
		tx.insert.mockResolvedValue({ generatedMaps: [], identifiers: [], raw: {} });
		tx.delete.mockResolvedValue({ raw: {}, affected: 0 });
	});

	describe('gating', () => {
		it('returns "skipped" when logStreamingManagedByEnv is false', async () => {
			const loader = createLoader({ logStreamingManagedByEnv: false });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(tx.insert).not.toHaveBeenCalled();
			expect(tx.delete).not.toHaveBeenCalled();
		});
	});

	describe('parse + validation errors', () => {
		async function expectRejectsWithBootstrappingError(
			loader: LogStreamingInstanceSettingsLoader,
			messagePattern: RegExp,
		) {
			let thrown: unknown;
			try {
				await loader.run();
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeInstanceOf(InstanceBootstrappingError);
			expect((thrown as Error).message).toMatch(messagePattern);
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith((thrown as Error).message);
		}

		it('throws on malformed JSON', async () => {
			const loader = createLoader({ logStreamingDestinations: '{not json' });

			await expectRejectsWithBootstrappingError(loader, /not valid JSON/);
		});

		it('throws when the top-level value is not an array', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify({ type: 'webhook', url: 'https://x.test' }),
			});

			await expectRejectsWithBootstrappingError(loader, /validation failed/);
		});

		it('throws when type is unknown', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([{ type: 'kafka', label: 'a' }]),
			});

			await expectRejectsWithBootstrappingError(loader, /validation failed/);
		});

		it('throws when a webhook is missing url', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([{ type: 'webhook', label: 'a' }]),
			});

			await expectRejectsWithBootstrappingError(loader, /validation failed/);
		});

		it('throws when id is not a UUID', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', id: 'not-a-uuid', label: 'a', url: 'https://x.test' },
				]),
			});

			await expectRejectsWithBootstrappingError(loader, /validation failed/);
		});

		it('throws on duplicate ids within the array', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', id: UUID_A, url: 'https://a.test', label: 'A' },
					{ type: 'webhook', id: UUID_A, url: 'https://b.test', label: 'B' },
				]),
			});

			await expectRejectsWithBootstrappingError(loader, /duplicate id/);
		});

		it('rejects unknown top-level fields', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', label: 'W', url: 'https://w.test', nope: 'extra' },
				]),
			});

			await expectRejectsWithBootstrappingError(loader, /validation failed/);
		});

		it('rejects syslog facility outside the 0–23 range', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'syslog', label: 'S', host: 'host.test', facility: 24 },
				]),
			});

			await expectRejectsWithBootstrappingError(loader, /validation failed/);
		});
	});

	describe('accepts', () => {
		it('circuitBreaker on any destination type', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{
						type: 'webhook',
						label: 'W',
						url: 'https://w.test',
						circuitBreaker: { maxFailures: 3, failureWindow: 30000 },
					},
					{
						type: 'syslog',
						label: 'S',
						host: 'syslog.test',
						circuitBreaker: { maxFailures: 5 },
					},
				]),
			});

			await expect(loader.run()).resolves.toBe('created');
		});

		it('syslog with protocol tls and no tlsCa', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'syslog', label: 'S', host: 'host.test', protocol: 'tls' },
				]),
			});

			await expect(loader.run()).resolves.toBe('created');
		});

		it('a fully-populated webhook options block', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{
						type: 'webhook',
						label: 'W',
						url: 'https://w.test',
						options: {
							allowUnauthorizedCerts: true,
							queryParameterArrays: 'brackets',
							redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
							proxy: { proxy: { protocol: 'https', host: 'proxy.test', port: 8080 } },
							timeout: 5000,
							socket: { keepAlive: true, maxSockets: 10, maxFreeSockets: 5 },
						},
					},
				]),
			});

			await expect(loader.run()).resolves.toBe('created');
		});

		it('items without id or label', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([{ type: 'webhook', url: 'https://w.test' }]),
			});

			await expect(loader.run()).resolves.toBe('created');
		});
	});

	describe('replace', () => {
		it('deletes all existing rows then inserts the env items', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{
						type: 'webhook',
						label: 'Audit',
						url: 'https://hooks.example.com',
						method: 'POST',
						headerParameters: {
							parameters: [{ name: 'Authorization', value: 'Bearer abc123' }],
						},
					},
				]),
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(tx.delete).toHaveBeenCalledTimes(1);
			expect(tx.delete).toHaveBeenCalledWith(expect.anything(), {});
			expect(tx.insert).toHaveBeenCalledTimes(1);
			const [, payload] = tx.insert.mock.calls[0];
			const rows = payload as Array<{ id: string; destination: Record<string, unknown> }>;
			expect(rows).toHaveLength(1);
			expect(rows[0].destination.__type).toBe(MessageEventBusDestinationTypeNames.webhook);
			expect(rows[0].destination.url).toBe('https://hooks.example.com');
			expect(rows[0].destination.label).toBe('Audit');
			expect(rows[0].destination.headerParameters).toEqual({
				parameters: [{ name: 'Authorization', value: 'Bearer abc123' }],
			});
			expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
		});

		it('uses the pinned id from env when provided', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', id: UUID_A, label: 'Pinned', url: 'https://pinned.test' },
				]),
			});

			await loader.run();

			const rows = tx.insert.mock.calls[0][1] as Array<{
				id: string;
				destination: Record<string, unknown>;
			}>;
			expect(rows[0].id).toBe(UUID_A);
			expect(rows[0].destination.id).toBe(UUID_A);
			expect(rows[0].destination.url).toBe('https://pinned.test');
		});

		it('generates a new id when one is not provided', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'syslog', label: 'SIEM', host: 'syslog.test' },
				]),
			});

			await loader.run();

			const rows = tx.insert.mock.calls[0][1] as Array<{
				id: string;
				destination: Record<string, unknown>;
			}>;
			expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
			expect(rows[0].destination.id).toBe(rows[0].id);
		});

		it('empty env array deletes every existing row without inserting', async () => {
			const loader = createLoader({ logStreamingDestinations: '[]' });

			await loader.run();

			expect(tx.delete).toHaveBeenCalledTimes(1);
			expect(tx.insert).not.toHaveBeenCalled();
		});

		it('treats an empty string the same as an empty array', async () => {
			const loader = createLoader({ logStreamingDestinations: '' });

			await loader.run();

			expect(tx.delete).toHaveBeenCalledTimes(1);
			expect(tx.insert).not.toHaveBeenCalled();
		});

		it('maps each env type to its internal __type discriminator', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', label: 'W', url: 'https://w.test' },
					{ type: 'syslog', label: 'S', host: 'syslog.test' },
					{ type: 'sentry', label: 'E', dsn: 'https://public@sentry.example.com/1' },
				]),
			});

			await loader.run();

			const rows = tx.insert.mock.calls[0][1] as Array<{
				destination: { __type: string };
			}>;
			expect(rows.map((r) => r.destination.__type)).toEqual([
				MessageEventBusDestinationTypeNames.webhook,
				MessageEventBusDestinationTypeNames.syslog,
				MessageEventBusDestinationTypeNames.sentry,
			]);
		});

		it('runs delete + insert inside a single transaction', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', label: 'W', url: 'https://w.test' },
				]),
			});

			await loader.run();

			expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
		});
	});
});
