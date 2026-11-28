import { testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { McpRegistryServerEntity } from '@/modules/mcp-registry/registry/mcp-registry-server.entity';
import { McpRegistryServerRepository } from '@/modules/mcp-registry/registry/mcp-registry-server.repository';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';
import { toEntity } from '@/modules/mcp-registry/registry/mcp-registry.types';
import {
	linearMockServer,
	notionMockServer,
	slackExtendingMockServer,
} from '@/modules/mcp-registry/registry/mock-servers';

const SEEDED_AT = new Date('2026-01-01T00:00:00.000Z');
const NEWER_AT = new Date('2026-02-01T00:00:00.000Z');
const OLDER_AT = new Date('2025-12-01T00:00:00.000Z');

const sortedSlugs = (entities: Array<{ slug: string }>): string[] =>
	entities.map(({ slug }) => slug).sort();

describe('McpRegistryServerRepository', () => {
	let repository: McpRegistryServerRepository;
	let tableRepository: Repository<McpRegistryServerEntity>;
	let transactionRunner: TransactionRunner;

	beforeAll(async () => {
		await testModules.loadModules(['mcp-registry']);
		await testDb.init();
		repository = Container.get(McpRegistryServerRepository);
		tableRepository = Container.get(DataSource).getRepository(McpRegistryServerEntity);
		transactionRunner = Container.get(TransactionRunner);
	});

	afterEach(async () => {
		await tableRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function seed(servers: McpRegistryServer[], updatedAt = SEEDED_AT): Promise<void> {
		await tableRepository.insert(servers.map((server) => ({ ...toEntity(server), updatedAt })));
	}

	describe('findBySlug', () => {
		it('should return the matching server entity or null when missing', async () => {
			await seed([notionMockServer]);

			const found = await repository.findBySlug(notionMockServer.slug, {});
			const missing = await repository.findBySlug('missing', {});

			expect(found?.slug).toBe(notionMockServer.slug);
			expect(found?.version).toBe(notionMockServer.version);
			expect(missing).toBeNull();
		});
	});

	describe('findBySlugs', () => {
		it('should return matching rows and omit unknown slugs', async () => {
			await seed([notionMockServer, linearMockServer, slackExtendingMockServer]);

			const rows = await repository.findBySlugs(
				[notionMockServer.slug, slackExtendingMockServer.slug, 'unknown'],
				{},
			);

			expect(sortedSlugs(rows)).toEqual(sortedSlugs([notionMockServer, slackExtendingMockServer]));
		});

		it('should return an empty array for an empty slug list', async () => {
			await seed([notionMockServer]);

			await expect(repository.findBySlugs([], {})).resolves.toEqual([]);
		});
	});

	describe('findAll / findActive', () => {
		it('should separate active rows from deprecated rows', async () => {
			const deprecatedLinear: McpRegistryServer = {
				...linearMockServer,
				status: 'deprecated',
			};
			await seed([notionMockServer, deprecatedLinear]);

			const all = await repository.findAll({});
			const active = await repository.findActive({});

			expect(sortedSlugs(all)).toEqual(sortedSlugs([notionMockServer, deprecatedLinear]));
			expect(sortedSlugs(active)).toEqual([notionMockServer.slug]);
		});
	});

	describe('readDbNow', () => {
		it('should return the current database timestamp as a Date', async () => {
			const now = await repository.readDbNow({});

			expect(now).toBeInstanceOf(Date);
			expect(Number.isNaN(now.getTime())).toBe(false);
		});
	});

	describe('upsertFetchedServers', () => {
		it('should insert new rows and overwrite only when fetchedAt is newer', async () => {
			await repository.upsertFetchedServers([toEntity(notionMockServer)], SEEDED_AT, {});

			await repository.upsertFetchedServers(
				[toEntity({ ...notionMockServer, version: '0.9.0' })],
				OLDER_AT,
				{},
			);
			expect((await tableRepository.findOneBy({ slug: notionMockServer.slug }))?.version).toBe(
				notionMockServer.version,
			);

			await repository.upsertFetchedServers(
				[toEntity({ ...notionMockServer, version: '2.0.0' }), toEntity(linearMockServer)],
				NEWER_AT,
				{},
			);

			const rows = await tableRepository.find();
			expect(sortedSlugs(rows)).toEqual(sortedSlugs([notionMockServer, linearMockServer]));
			expect(rows.find(({ slug }) => slug === notionMockServer.slug)?.version).toBe('2.0.0');
		});

		it('should do nothing for an empty row list', async () => {
			await seed([notionMockServer]);

			await repository.upsertFetchedServers([], NEWER_AT, {});

			expect(sortedSlugs(await tableRepository.find())).toEqual([notionMockServer.slug]);
		});
	});

	describe('replaceAll', () => {
		it('should replace all existing rows in one transaction', async () => {
			await seed([slackExtendingMockServer]);

			await repository.replaceAll([notionMockServer, linearMockServer].map(toEntity), {});

			expect(sortedSlugs(await tableRepository.find())).toEqual(
				sortedSlugs([notionMockServer, linearMockServer]),
			);
		});

		it('should delete all rows when given an empty list', async () => {
			await seed([notionMockServer, linearMockServer]);

			await repository.replaceAll([], {});

			expect(await tableRepository.find()).toEqual([]);
		});

		it('should roll back the delete when inserting replacement rows fails', async () => {
			await seed([slackExtendingMockServer]);

			await expect(
				repository.replaceAll([notionMockServer, notionMockServer].map(toEntity), {}),
			).rejects.toThrow();

			expect(sortedSlugs(await tableRepository.find())).toEqual([slackExtendingMockServer.slug]);
		});
	});

	describe('transaction context reuse', () => {
		it('should read uncommitted writes and roll them back with the surrounding transaction', async () => {
			await seed([slackExtendingMockServer]);

			await expect(
				transactionRunner.run({}, async (ctx) => {
					const dbNow = await repository.readDbNow(ctx);
					await repository.upsertFetchedServers([toEntity(notionMockServer)], dbNow, ctx);

					expect((await repository.findBySlug(notionMockServer.slug, ctx))?.slug).toBe(
						notionMockServer.slug,
					);
					expect(sortedSlugs(await repository.findBySlugs([notionMockServer.slug], ctx))).toEqual([
						notionMockServer.slug,
					]);
					expect(sortedSlugs(await repository.findAll(ctx))).toEqual(
						sortedSlugs([slackExtendingMockServer, notionMockServer]),
					);
					expect(sortedSlugs(await repository.findActive(ctx))).toEqual(
						sortedSlugs([slackExtendingMockServer, notionMockServer]),
					);

					throw new Error('rollback upsert');
				}),
			).rejects.toThrow('rollback upsert');

			expect(sortedSlugs(await tableRepository.find())).toEqual([slackExtendingMockServer.slug]);
		});

		it('should join a surrounding transaction in replaceAll and roll back on failure', async () => {
			await seed([slackExtendingMockServer]);

			await expect(
				transactionRunner.run({}, async (ctx) => {
					await repository.replaceAll([toEntity(notionMockServer)], ctx);

					expect(sortedSlugs(await repository.findAll(ctx))).toEqual([notionMockServer.slug]);

					throw new Error('rollback replaceAll');
				}),
			).rejects.toThrow('rollback replaceAll');

			expect(sortedSlugs(await tableRepository.find())).toEqual([slackExtendingMockServer.slug]);
		});
	});
});
