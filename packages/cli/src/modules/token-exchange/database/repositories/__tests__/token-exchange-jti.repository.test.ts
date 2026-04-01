import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { TokenExchangeJtiRepository } from '../token-exchange-jti.repository';

describe('TokenExchangeJtiRepository', () => {
	const escapeFn = (name: string) => `"${name}"`;
	const mockQuery = jest.fn();

	function createRepository(dbType: 'postgresdb' | 'sqlite') {
		const globalConfig = mock<GlobalConfig>({ database: { type: dbType } } as never);
		const dataSource = {
			manager: {
				connection: { driver: { escape: escapeFn } },
			},
		};

		const repo = new TokenExchangeJtiRepository(dataSource as never, globalConfig);
		repo.query = mockQuery;
		return repo;
	}

	beforeEach(() => jest.clearAllMocks());

	describe('atomicConsume', () => {
		const jti = 'test-jti';
		const expiresAt = new Date('2026-04-01T12:00:00Z');

		describe('postgres', () => {
			it('should return true when row is inserted (first use)', async () => {
				const repo = createRepository('postgresdb');
				mockQuery.mockResolvedValue([{ inserted: true }]);

				const result = await repo.atomicConsume(jti, expiresAt);

				expect(result).toBe(true);
				expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), [
					jti,
					expiresAt,
				]);
			});

			it('should return false when row already exists (replay)', async () => {
				const repo = createRepository('postgresdb');
				mockQuery.mockResolvedValue([{ inserted: false }]);

				const result = await repo.atomicConsume(jti, expiresAt);

				expect(result).toBe(false);
			});
		});

		describe('sqlite', () => {
			it('should return true when row is inserted (first use)', async () => {
				const repo = createRepository('sqlite');
				mockQuery.mockResolvedValue([{ inserted: 1 }]);

				const result = await repo.atomicConsume(jti, expiresAt);

				expect(result).toBe(true);
				expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT OR IGNORE'), [
					jti,
					expiresAt.toISOString(),
				]);
			});

			it('should return false when row already exists (replay)', async () => {
				const repo = createRepository('sqlite');
				mockQuery.mockResolvedValue([{ inserted: 0 }]);

				const result = await repo.atomicConsume(jti, expiresAt);

				expect(result).toBe(false);
			});
		});
	});

	describe('deleteExpiredBatch', () => {
		it('should execute CTE delete with batch size (postgres)', async () => {
			const repo = createRepository('postgresdb');
			mockQuery.mockResolvedValue([{ count: '5' }]);

			const result = await repo.deleteExpiredBatch(100);

			expect(result).toBe(5);
			expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('RETURNING'), [100]);
			expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'), [100]);
		});

		it('should execute CTE delete with batch size (sqlite)', async () => {
			const repo = createRepository('sqlite');
			mockQuery.mockResolvedValue([{ count: 3 }]);

			const result = await repo.deleteExpiredBatch(100);

			expect(result).toBe(3);
			expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("datetime('now')"), [100]);
			expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('RETURNING'), [100]);
		});

		it('should return 0 when no rows are deleted', async () => {
			const repo = createRepository('postgresdb');
			mockQuery.mockResolvedValue([{ count: '0' }]);

			const result = await repo.deleteExpiredBatch(100);

			expect(result).toBe(0);
		});
	});
});
