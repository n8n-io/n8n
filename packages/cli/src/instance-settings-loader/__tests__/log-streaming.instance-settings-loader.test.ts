import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import type { EventDestinations } from '@/modules/log-streaming.ee/database/entities';
import type { EventDestinationsRepository } from '@/modules/log-streaming.ee/database/repositories/event-destination.repository';

import { InstanceBootstrappingError } from '../instance-bootstrapping.error';
import { LogStreamingInstanceSettingsLoader } from '../loaders/log-streaming.instance-settings-loader';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

const createRow = (overrides: {
	id: string;
	createdAt?: Date;
	destination: Record<string, unknown>;
}): EventDestinations =>
	({
		id: overrides.id,
		createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
		updatedAt: new Date('2024-01-01T00:00:00Z'),
		destination: overrides.destination,
	}) as unknown as EventDestinations;

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
		tx.find.mockResolvedValue([]);
		tx.upsert.mockResolvedValue({ generatedMaps: [], identifiers: [], raw: {} });
		tx.delete.mockResolvedValue({ raw: {}, affected: 0 });
	});

	describe('gating', () => {
		it('returns "skipped" when logStreamingManagedByEnv is false', async () => {
			const loader = createLoader({ logStreamingManagedByEnv: false });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(tx.find).not.toHaveBeenCalled();
			expect(tx.upsert).not.toHaveBeenCalled();
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

		it('throws when an item has neither id nor label', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([{ type: 'webhook', url: 'https://x.test' }]),
			});

			await expectRejectsWithBootstrappingError(loader, /must have either "id" or "label"/);
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

		it('throws on duplicate (type, label) within the array when no ids are given', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', label: 'Audit', url: 'https://a.test' },
					{ type: 'webhook', label: 'Audit', url: 'https://b.test' },
				]),
			});

			await expectRejectsWithBootstrappingError(loader, /duplicate \(type,label\)/);
		});

		it('throws on duplicate (type, label) even when items have distinct ids', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', id: UUID_A, label: 'Audit', url: 'https://a.test' },
					{ type: 'webhook', id: UUID_B, label: 'Audit', url: 'https://b.test' },
				]),
			});

			await expectRejectsWithBootstrappingError(loader, /duplicate \(type,label\)/);
		});

		it('rejects unknown top-level fields', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', label: 'W', url: 'https://w.test', nope: 'extra' },
				]),
			});

			await expectRejectsWithBootstrappingError(loader, /validation failed/);
		});

		it('rejects webhook method values outside GET/POST/PUT', async () => {
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', label: 'W', url: 'https://w.test', method: 'DELETE' },
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
			tx.find.mockResolvedValue([]);
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
			tx.find.mockResolvedValue([]);
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'syslog', label: 'S', host: 'host.test', protocol: 'tls' },
				]),
			});

			await expect(loader.run()).resolves.toBe('created');
		});

		it('a fully-populated webhook options block', async () => {
			tx.find.mockResolvedValue([]);
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
	});

	describe('reconciliation', () => {
		it('inserts when the env array is non-empty and the DB is empty', async () => {
			tx.find.mockResolvedValue([]);
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
			expect(tx.upsert).toHaveBeenCalledTimes(1);
			const [, payload] = tx.upsert.mock.calls[0];
			const rows = payload as Array<{ id: string; destination: Record<string, unknown> }>;
			expect(rows).toHaveLength(1);
			expect(rows[0].destination.__type).toBe(MessageEventBusDestinationTypeNames.webhook);
			expect(rows[0].destination.url).toBe('https://hooks.example.com');
			expect(rows[0].destination.label).toBe('Audit');
			expect(rows[0].destination.headerParameters).toEqual({
				parameters: [{ name: 'Authorization', value: 'Bearer abc123' }],
			});
			expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
			expect(tx.delete).not.toHaveBeenCalled();
		});

		it('updates an existing row when id matches', async () => {
			tx.find.mockResolvedValue([
				createRow({
					id: UUID_A,
					destination: {
						__type: MessageEventBusDestinationTypeNames.webhook,
						id: UUID_A,
						label: 'Old',
						url: 'https://old.test',
					},
				}),
			]);
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', id: UUID_A, label: 'New', url: 'https://new.test' },
				]),
			});

			await loader.run();

			expect(tx.upsert).toHaveBeenCalledTimes(1);
			const rows = tx.upsert.mock.calls[0][1] as Array<{
				id: string;
				destination: Record<string, unknown>;
			}>;
			expect(rows[0].id).toBe(UUID_A);
			expect(rows[0].destination.url).toBe('https://new.test');
			expect(rows[0].destination.label).toBe('New');
			expect(tx.delete).not.toHaveBeenCalled();
		});

		it('matches on (label, type) when id is absent, preserving the existing id', async () => {
			tx.find.mockResolvedValue([
				createRow({
					id: UUID_B,
					destination: {
						__type: MessageEventBusDestinationTypeNames.syslog,
						id: UUID_B,
						label: 'SIEM',
						host: 'old.host',
					},
				}),
			]);
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'syslog', label: 'SIEM', host: 'new.host', port: 514, protocol: 'tcp' },
				]),
			});

			await loader.run();

			const rows = tx.upsert.mock.calls[0][1] as Array<{
				id: string;
				destination: Record<string, unknown>;
			}>;
			expect(rows[0].id).toBe(UUID_B);
			expect(rows[0].destination.host).toBe('new.host');
			expect(rows[0].destination.port).toBe(514);
			expect(rows[0].destination.protocol).toBe('tcp');
		});

		it('deletes DB rows not referenced by any env item', async () => {
			tx.find.mockResolvedValue([
				createRow({
					id: UUID_A,
					destination: {
						__type: MessageEventBusDestinationTypeNames.webhook,
						id: UUID_A,
						label: 'Kept',
						url: 'https://kept.test',
					},
				}),
				createRow({
					id: UUID_B,
					destination: {
						__type: MessageEventBusDestinationTypeNames.sentry,
						id: UUID_B,
						label: 'Stale',
						dsn: 'https://public@sentry.example.com/1',
					},
				}),
			]);
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', id: UUID_A, label: 'Kept', url: 'https://kept.test' },
				]),
			});

			await loader.run();

			expect(tx.delete).toHaveBeenCalledTimes(1);
			const [, criteria] = tx.delete.mock.calls[0];
			const deletedIds = (criteria as { id: { _value: string[] } }).id._value;
			expect(deletedIds).toEqual([UUID_B]);
		});

		it('keeps the oldest row when multiple DB rows share (label, type); deletes the rest', async () => {
			tx.find.mockResolvedValue([
				createRow({
					id: UUID_A,
					createdAt: new Date('2024-01-01T00:00:00Z'),
					destination: {
						__type: MessageEventBusDestinationTypeNames.webhook,
						id: UUID_A,
						label: 'Dup',
						url: 'https://a.test',
					},
				}),
				createRow({
					id: UUID_B,
					createdAt: new Date('2024-02-01T00:00:00Z'),
					destination: {
						__type: MessageEventBusDestinationTypeNames.webhook,
						id: UUID_B,
						label: 'Dup',
						url: 'https://b.test',
					},
				}),
				createRow({
					id: UUID_C,
					createdAt: new Date('2024-03-01T00:00:00Z'),
					destination: {
						__type: MessageEventBusDestinationTypeNames.webhook,
						id: UUID_C,
						label: 'Dup',
						url: 'https://c.test',
					},
				}),
			]);
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', label: 'Dup', url: 'https://new.test' },
				]),
			});

			await loader.run();

			const rows = tx.upsert.mock.calls[0][1] as Array<{ id: string }>;
			expect(rows[0].id).toBe(UUID_A);
			const deletedIds = (tx.delete.mock.calls[0][1] as { id: { _value: string[] } }).id._value;
			expect(new Set(deletedIds)).toEqual(new Set([UUID_B, UUID_C]));
		});

		it('empty env array deletes every existing row', async () => {
			tx.find.mockResolvedValue([
				createRow({
					id: UUID_A,
					destination: {
						__type: MessageEventBusDestinationTypeNames.webhook,
						id: UUID_A,
						label: 'Any',
						url: 'https://a.test',
					},
				}),
			]);
			const loader = createLoader({ logStreamingDestinations: '[]' });

			await loader.run();

			expect(tx.upsert).not.toHaveBeenCalled();
			expect(tx.delete).toHaveBeenCalledTimes(1);
		});

		it('treats an empty string the same as an empty array', async () => {
			tx.find.mockResolvedValue([
				createRow({
					id: UUID_A,
					destination: {
						__type: MessageEventBusDestinationTypeNames.webhook,
						id: UUID_A,
						label: 'Any',
						url: 'https://a.test',
					},
				}),
			]);
			const loader = createLoader({ logStreamingDestinations: '' });

			await loader.run();

			expect(tx.upsert).not.toHaveBeenCalled();
			expect(tx.delete).toHaveBeenCalledTimes(1);
		});

		it('maps each env type to its internal __type discriminator', async () => {
			tx.find.mockResolvedValue([]);
			const loader = createLoader({
				logStreamingDestinations: JSON.stringify([
					{ type: 'webhook', label: 'W', url: 'https://w.test' },
					{ type: 'syslog', label: 'S', host: 'syslog.test' },
					{ type: 'sentry', label: 'E', dsn: 'https://public@sentry.example.com/1' },
				]),
			});

			await loader.run();

			const rows = tx.upsert.mock.calls[0][1] as Array<{
				destination: { __type: string };
			}>;
			expect(rows.map((r) => r.destination.__type)).toEqual([
				MessageEventBusDestinationTypeNames.webhook,
				MessageEventBusDestinationTypeNames.syslog,
				MessageEventBusDestinationTypeNames.sentry,
			]);
		});

		it('runs reconciliation inside a transaction', async () => {
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
