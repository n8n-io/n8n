import type { DatabaseConfig } from '@n8n/config';
import { QueryFailedError } from '@n8n/typeorm';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { OperationalError } from 'n8n-workflow';

import { DbLockService } from '../db-lock.service';

describe('DbLockService', () => {
	const mockTx = mock<EntityManager>();
	const dataSource = mock<DataSource>();
	const databaseConfig = mock<DatabaseConfig>();

	const transactionMock = jest.fn<Promise<unknown>, [(tx: EntityManager) => Promise<unknown>]>();

	let service: DbLockService;

	beforeEach(() => {
		jest.resetAllMocks();
		transactionMock.mockImplementation(async (fn) => await fn(mockTx));
		dataSource.manager.transaction = transactionMock as never;
		mockTx.query.mockResolvedValue([]);
		service = new DbLockService(dataSource, databaseConfig);
	});

	describe('withLock', () => {
		it('should acquire advisory lock and execute fn on Postgres', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn().mockResolvedValue('result');

			const result = await service.withLock(1001, fn);

			expect(result).toBe('result');
			expect(mockTx.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [1001]);
			expect(fn).toHaveBeenCalledWith(mockTx);
		});

		it('should skip advisory lock on SQLite and still execute fn', async () => {
			databaseConfig.type = 'sqlite';
			const fn = jest.fn().mockResolvedValue('result');

			const result = await service.withLock(1001, fn);

			expect(result).toBe('result');
			expect(mockTx.query).not.toHaveBeenCalled();
			expect(fn).toHaveBeenCalledWith(mockTx);
		});

		it('should set lock_timeout when timeoutMs is provided', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn().mockResolvedValue('result');

			await service.withLock(1001, fn, { timeoutMs: 5000 });

			expect(mockTx.query).toHaveBeenCalledWith("SET LOCAL lock_timeout = '5000'");
			expect(mockTx.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [1001]);
		});

		it('should not set lock_timeout when timeoutMs is not provided', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn().mockResolvedValue('result');

			await service.withLock(1001, fn);

			expect(mockTx.query).not.toHaveBeenCalledWith(expect.stringContaining('lock_timeout'));
			expect(mockTx.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [1001]);
		});

		it('should throw OperationalError when lock timeout is exceeded', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn();
			const timeoutError = new QueryFailedError(
				'SELECT pg_advisory_xact_lock($1)',
				[1001],
				new Error('canceling statement due to lock timeout'),
			);

			// First call succeeds (SET LOCAL), second call throws (advisory lock)
			mockTx.query.mockResolvedValueOnce(undefined).mockRejectedValueOnce(timeoutError);

			await expect(service.withLock(1001, fn, { timeoutMs: 5000 })).rejects.toThrow(
				OperationalError,
			);
			expect(fn).not.toHaveBeenCalled();
		});

		it('should include timeout details in OperationalError message', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn();
			const timeoutError = new QueryFailedError(
				'SELECT pg_advisory_xact_lock($1)',
				[1001],
				new Error('canceling statement due to lock timeout'),
			);

			mockTx.query.mockResolvedValueOnce(undefined).mockRejectedValueOnce(timeoutError);

			await expect(service.withLock(1001, fn, { timeoutMs: 5000 })).rejects.toThrow(
				/Timed out waiting for DbLock 1001 after 5000ms/,
			);
		});

		it('should propagate non-timeout errors unchanged', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn();
			const otherError = new Error('connection lost');

			mockTx.query.mockRejectedValueOnce(otherError);

			await expect(service.withLock(1001, fn)).rejects.toThrow('connection lost');
			expect(fn).not.toHaveBeenCalled();
		});
	});

	describe('tryWithLock', () => {
		it('should execute fn when lock is acquired', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn().mockResolvedValue('result');
			mockTx.query.mockResolvedValueOnce([{ pg_try_advisory_xact_lock: true }]);

			const result = await service.tryWithLock(1001, fn);

			expect(result).toBe('result');
			expect(mockTx.query).toHaveBeenCalledWith('SELECT pg_try_advisory_xact_lock($1)', [1001]);
			expect(fn).toHaveBeenCalledWith(mockTx);
		});

		it('should throw OperationalError when lock is already held', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn();
			mockTx.query.mockResolvedValueOnce([{ pg_try_advisory_xact_lock: false }]);

			const error = await service.tryWithLock(1001, fn).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(OperationalError);
			expect((error as OperationalError).message).toMatch(
				/DbLock 1001 is already held by another process/,
			);
			expect(fn).not.toHaveBeenCalled();
		});

		it('should skip advisory lock on SQLite and execute fn', async () => {
			databaseConfig.type = 'sqlite';
			const fn = jest.fn().mockResolvedValue('result');

			const result = await service.tryWithLock(1001, fn);

			expect(result).toBe('result');
			expect(mockTx.query).not.toHaveBeenCalled();
			expect(fn).toHaveBeenCalledWith(mockTx);
		});
	});
});
