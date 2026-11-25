import type { GlobalConfig } from '@n8n/config';
import type { TransactionRunner } from '@n8n/db';
import type { DataSource, EntityManager, EntityMetadata, QueryRunner } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { TokenExchangeJti } from '../../entities/token-exchange-jti.entity';
import { TokenExchangeJtiRepository } from '../token-exchange-jti.repository';

function createFixture(dbType: 'postgresdb' | 'sqlite', schema?: string) {
	const driver = mock<DataSource['driver']>({
		escape: vi.fn((name: string) => `"${name}"`),
	});
	const queryRunner = mock<QueryRunner>();
	const manager = mock<EntityManager>();
	const dataSource = mock<DataSource>({
		driver,
		manager,
		getMetadata: vi.fn().mockReturnValue(
			mock<EntityMetadata>({
				target: TokenExchangeJti,
				schema,
				tableName: 'token_exchange_jti',
			}),
		),
		createQueryRunner: vi.fn().mockReturnValue(queryRunner),
	});
	Object.assign(manager, { connection: dataSource });
	const transactionRunner = mock<TransactionRunner>();
	const globalConfig = mock<GlobalConfig>({
		database: mock<GlobalConfig['database']>({ type: dbType }),
	});
	const repository = new TokenExchangeJtiRepository(dataSource, transactionRunner, globalConfig);

	return { repository, dataSource, manager, queryRunner, driver };
}

describe('TokenExchangeJtiRepository', () => {
	describe('constructor', () => {
		it('should resolve metadata for TokenExchangeJti via the composed table', () => {
			const { dataSource } = createFixture('postgresdb', 'custom_schema');

			expect(dataSource.getMetadata).toHaveBeenCalledWith(TokenExchangeJti);
		});
	});

	describe('atomicConsume', () => {
		const expiresAt = new Date('2026-11-24T12:00:00.000Z');

		it('should escape table and column identifiers on postgresdb', async () => {
			const { repository, manager } = createFixture('postgresdb', 'n8n');
			manager.query.mockResolvedValue([{ inserted: true }]);

			const result = await repository.atomicConsume('jti-pg', expiresAt, {});

			expect(result).toBe(true);
			expect(manager.query).toHaveBeenCalledWith(
				expect.stringContaining(
					'INSERT INTO "n8n"."token_exchange_jti" ("jti", "expiresAt", "createdAt")',
				),
				['jti-pg', expiresAt],
			);
			const [sql] = manager.query.mock.calls[0];
			expect(sql).toContain('ON CONFLICT ("jti") DO NOTHING');
			expect(sql).toContain('RETURNING "jti"');
		});

		it('should escape table and column identifiers on sqlite', async () => {
			const { repository, queryRunner } = createFixture('sqlite');
			queryRunner.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([{ cnt: 1 }]);

			const result = await repository.atomicConsume('jti-sqlite', expiresAt, {});

			expect(result).toBe(true);
			expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				1,
				'INSERT OR IGNORE INTO "token_exchange_jti" ("jti", "expiresAt", "createdAt") VALUES (?, datetime(?), datetime(\'now\'))',
				['jti-sqlite', expiresAt.toISOString()],
			);
			expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
			expect(queryRunner.release).toHaveBeenCalledTimes(1);
		});
	});

	describe('deleteExpiredBatch', () => {
		it('should escape table and column identifiers on postgresdb', async () => {
			const { repository, manager } = createFixture('postgresdb', 'n8n');
			manager.query.mockResolvedValue([{ count: '4' }]);

			const deleted = await repository.deleteExpiredBatch(250, {});

			expect(deleted).toBe(4);
			expect(manager.query).toHaveBeenCalledWith(
				expect.stringContaining('DELETE FROM "n8n"."token_exchange_jti"'),
				[250],
			);
			const [sql] = manager.query.mock.calls[0];
			expect(sql).toContain('WHERE "jti" IN (');
			expect(sql).toContain('SELECT "jti" FROM "n8n"."token_exchange_jti"');
			expect(sql).toContain('WHERE "expiresAt" < NOW()');
			expect(sql).toContain('RETURNING "jti"');
			expect(sql).toContain('SELECT COUNT(*) AS "count" FROM deleted');
		});

		it('should escape table and column identifiers on sqlite', async () => {
			const { repository, queryRunner } = createFixture('sqlite');
			queryRunner.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([{ cnt: 3 }]);

			const deleted = await repository.deleteExpiredBatch(100, {});

			expect(deleted).toBe(3);
			expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				1,
				expect.stringContaining('DELETE FROM "token_exchange_jti" WHERE "jti" IN ('),
				[100],
			);
			const [sql] = queryRunner.query.mock.calls[0];
			expect(sql).toContain('SELECT "jti" FROM "token_exchange_jti"');
			expect(sql).toContain('WHERE "expiresAt" < datetime(\'now\')');
			expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
			expect(queryRunner.release).toHaveBeenCalledTimes(1);
		});
	});
});
