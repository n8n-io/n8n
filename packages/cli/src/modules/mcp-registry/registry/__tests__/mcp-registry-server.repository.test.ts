import type { TransactionRunner } from '@n8n/db';
import {
	In,
	type DataSource,
	type DeleteQueryBuilder,
	type DeleteResult,
	type EntityManager,
	type EntityMetadata,
	type InsertQueryBuilder,
	type InsertResult,
	type SelectQueryBuilder,
} from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { McpRegistryServerEntity } from '../mcp-registry-server.entity';
import { McpRegistryServerRepository } from '../mcp-registry-server.repository';
import { toEntity } from '../mcp-registry.types';
import { linearMockServer, notionMockServer } from '../mock-servers';

function createFixture(dbType: 'postgres' | 'sqlite' = 'sqlite') {
	const insertBuilder = mock<InsertQueryBuilder<McpRegistryServerEntity>>();
	insertBuilder.values.mockReturnValue(insertBuilder);
	insertBuilder.onConflict.mockReturnValue(insertBuilder);
	insertBuilder.execute.mockResolvedValue(mock<InsertResult>());

	const deleteBuilder = mock<DeleteQueryBuilder<McpRegistryServerEntity>>();
	deleteBuilder.from.mockReturnValue(deleteBuilder);
	deleteBuilder.execute.mockResolvedValue(mock<DeleteResult>());

	const queryBuilder = mock<SelectQueryBuilder<McpRegistryServerEntity>>();
	queryBuilder.insert.mockReturnValue(insertBuilder);
	queryBuilder.delete.mockReturnValue(deleteBuilder);

	const driver = mock<DataSource['driver']>({
		escape: vi.fn((name: string) => `"${name}"`),
	});
	const manager = mock<EntityManager>({
		createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
	});
	const dataSource = mock<DataSource>({
		options: { type: dbType },
		driver,
		manager,
		getMetadata: vi.fn().mockReturnValue(
			mock<EntityMetadata>({
				target: McpRegistryServerEntity,
				tableName: 'mcp_registry_server',
				tablePath: 'mcp_registry_server',
			}),
		),
	});
	Object.assign(manager, { connection: dataSource });

	const transactionRunner = mock<TransactionRunner>({
		run: vi.fn(async (ctx, fn) => await fn(ctx)),
	});
	const repository = new McpRegistryServerRepository(dataSource, transactionRunner);

	return {
		repository,
		manager,
		driver,
		queryBuilder,
		insertBuilder,
		deleteBuilder,
		transactionRunner,
	};
}

describe('McpRegistryServerRepository', () => {
	describe('findBySlug', () => {
		it('should query by slug and return the matching entity', async () => {
			const { repository, manager } = createFixture();
			const entity = mock<McpRegistryServerEntity>({ slug: notionMockServer.slug });
			manager.findOneBy.mockResolvedValue(entity);

			const result = await repository.findBySlug(notionMockServer.slug, {});

			expect(manager.findOneBy).toHaveBeenCalledWith(McpRegistryServerEntity, {
				slug: notionMockServer.slug,
			});
			expect(result).toBe(entity);
		});
	});

	describe('findBySlugs', () => {
		it('should return an empty array without querying when slugs is empty', async () => {
			const { repository, manager } = createFixture();

			const result = await repository.findBySlugs([], {});

			expect(result).toEqual([]);
			expect(manager.findBy).not.toHaveBeenCalled();
		});

		it('should filter by the provided slugs', async () => {
			const { repository, manager } = createFixture();
			const entities = [
				mock<McpRegistryServerEntity>({ slug: notionMockServer.slug }),
				mock<McpRegistryServerEntity>({ slug: linearMockServer.slug }),
			];
			manager.findBy.mockResolvedValue(entities);

			const slugs = [notionMockServer.slug, linearMockServer.slug];
			const result = await repository.findBySlugs(slugs, {});

			expect(manager.findBy).toHaveBeenCalledWith(McpRegistryServerEntity, {
				slug: In(slugs),
			});
			expect(result).toBe(entities);
		});
	});

	describe('findAll / findActive', () => {
		it('should load every stored server in findAll', async () => {
			const { repository, manager } = createFixture();
			const entities = [mock<McpRegistryServerEntity>({ slug: notionMockServer.slug })];
			manager.find.mockResolvedValue(entities);

			const result = await repository.findAll({});

			expect(manager.find).toHaveBeenCalledWith(McpRegistryServerEntity);
			expect(result).toBe(entities);
		});

		it('should filter by active status in findActive', async () => {
			const { repository, manager } = createFixture();
			const entities = [mock<McpRegistryServerEntity>({ slug: notionMockServer.slug })];
			manager.findBy.mockResolvedValue(entities);

			const result = await repository.findActive({});

			expect(manager.findBy).toHaveBeenCalledWith(McpRegistryServerEntity, { status: 'active' });
			expect(result).toBe(entities);
		});
	});

	describe('readDbNow', () => {
		it('should query the PostgreSQL clock literal on postgres connections', async () => {
			const { repository, manager } = createFixture('postgres');
			const expected = new Date('2026-05-01T12:00:00.000Z');
			manager.query.mockResolvedValue([{ dbNow: expected }]);

			const result = await repository.readDbNow({});

			expect(manager.query).toHaveBeenCalledWith('SELECT CURRENT_TIMESTAMP(3) AS "dbNow"');
			expect(result).toEqual(expected);
		});

		it('should query the SQLite clock literal on sqlite connections', async () => {
			const { repository, manager } = createFixture('sqlite');
			manager.query.mockResolvedValue([{ dbNow: '2026-05-01 12:00:00.000' }]);

			const result = await repository.readDbNow({});

			expect(manager.query).toHaveBeenCalledWith(
				"SELECT STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') AS \"dbNow\"",
			);
			expect(result).toEqual(new Date('2026-05-01T12:00:00.000Z'));
		});
	});

	describe('upsertFetchedServers', () => {
		it('should escape table and column identifiers in the conflict update clause', async () => {
			const { repository, manager, insertBuilder } = createFixture('postgres');
			const fetchedAt = new Date('2026-05-01T12:00:00.000Z');
			const notionRow = toEntity(notionMockServer);
			const linearRow = toEntity(linearMockServer);

			await repository.upsertFetchedServers([notionRow, linearRow], fetchedAt, {});

			expect(manager.createQueryBuilder).toHaveBeenCalledWith(
				McpRegistryServerEntity,
				'mcp_registry_server',
			);
			expect(insertBuilder.values).toHaveBeenCalledWith([
				{ ...linearRow, updatedAt: fetchedAt },
				{ ...notionRow, updatedAt: fetchedAt },
			]);
			expect(insertBuilder.onConflict).toHaveBeenCalledWith(
				'("slug") DO UPDATE SET "status" = EXCLUDED."status", "version" = EXCLUDED."version", "registryUpdatedAt" = EXCLUDED."registryUpdatedAt", "data" = EXCLUDED."data", "updatedAt" = EXCLUDED."updatedAt" WHERE "mcp_registry_server"."updatedAt" < EXCLUDED."updatedAt"',
			);
			expect(insertBuilder.execute).toHaveBeenCalledTimes(1);
		});
	});

	describe('replaceAll', () => {
		it('should delete all rows and insert replacements inside one transaction', async () => {
			const { repository, manager, deleteBuilder, transactionRunner } = createFixture();
			const rows = [toEntity(notionMockServer), toEntity(linearMockServer)];

			await repository.replaceAll(rows, {});

			expect(transactionRunner.run).toHaveBeenCalledTimes(1);
			expect(deleteBuilder.from).toHaveBeenCalledWith(McpRegistryServerEntity);
			expect(deleteBuilder.execute).toHaveBeenCalledTimes(1);
			expect(manager.insert).toHaveBeenCalledWith(McpRegistryServerEntity, rows);
		});

		it('should skip inserting when the replacement list is empty', async () => {
			const { repository, manager, deleteBuilder } = createFixture();

			await repository.replaceAll([], {});

			expect(deleteBuilder.from).toHaveBeenCalledWith(McpRegistryServerEntity);
			expect(deleteBuilder.execute).toHaveBeenCalledTimes(1);
			expect(manager.insert).not.toHaveBeenCalled();
		});
	});
});
