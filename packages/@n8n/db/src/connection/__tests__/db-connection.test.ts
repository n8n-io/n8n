/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import { DataSource, type DataSourceOptions, type QueryRunner } from '@n8n/typeorm';
import { mock, mockDeep } from 'jest-mock-extended';
import type { BinaryDataConfig, ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError, OperationalError } from 'n8n-workflow';

import * as migrationHelper from '../../migrations/migration-helpers';
import type { Migration } from '../../migrations/migration-types';
import { DbConnection } from '../db-connection';
import type { DbConnectionOptions } from '../db-connection-options';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('@n8n/typeorm', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	DataSource: jest.fn(),
	...jest.requireActual('@n8n/typeorm'),
}));

describe('DbConnection', () => {
	let dbConnection: DbConnection;
	const migrations = [{ name: 'TestMigration1' }, { name: 'TestMigration2' }] as Migration[];
	const errorReporter = mock<ErrorReporter>();
	const databaseConfig = mock<DatabaseConfig>();
	const logger = mock<Logger>();
	const binaryDataConfig = mock<BinaryDataConfig>({
		availableModes: ['filesystem'],
		dbMaxFileSize: 512,
	});
	const dataSource = mockDeep<DataSource>({ options: { migrations } });
	const connectionOptions = mockDeep<DbConnectionOptions>();
	const postgresOptions: DataSourceOptions = {
		type: 'postgres',
		host: 'localhost',
		port: 5432,
		username: 'user',
		password: 'password',
		database: 'n8n',
		migrations,
	};

	// Mock QueryRunner for advisory lock tests
	const mockQueryRunner = mock<QueryRunner>();

	beforeEach(() => {
		jest.resetAllMocks();

		connectionOptions.getOptions.mockReturnValue(postgresOptions);
		(DataSource as jest.Mock) = jest.fn().mockImplementation(() => dataSource);

		// Default mock for QueryRunner - returns true (lock acquired)
		// eslint-disable-next-line @typescript-eslint/naming-convention
		mockQueryRunner.query.mockResolvedValue([{ pg_try_advisory_lock: true }]);
		mockQueryRunner.release.mockResolvedValue(undefined);
		dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

		dbConnection = new DbConnection(
			errorReporter,
			connectionOptions,
			databaseConfig,
			logger,
			binaryDataConfig,
		);
	});

	describe('init', () => {
		it('should initialize the data source', async () => {
			dataSource.initialize.mockResolvedValue(dataSource);

			await dbConnection.init();

			expect(dataSource.initialize).toHaveBeenCalled();
			expect(dbConnection.connectionState.connected).toBe(true);
		});

		it('should not reinitialize if already connected', async () => {
			dataSource.initialize.mockResolvedValue(dataSource);
			dbConnection.connectionState.connected = true;

			await dbConnection.init();

			expect(dataSource.initialize).not.toHaveBeenCalled();
		});

		it('should wrap postgres connection timeout errors', async () => {
			const originalError = new Error('Connection terminated due to connection timeout');
			dataSource.initialize.mockRejectedValue(originalError);
			connectionOptions.getOptions.mockReturnValue({
				type: 'postgres',
				connectTimeoutMS: 10000,
			});

			await expect(dbConnection.init()).rejects.toThrow(DbConnectionTimeoutError);
		});

		it('should rethrow other errors', async () => {
			// Arrange
			const error = new Error('Some other error');
			dataSource.initialize.mockRejectedValue(error);

			// Act & Assert
			await expect(dbConnection.init()).rejects.toThrow('Some other error');
		});

		it('should set max_allowed_packet for mysql with database binary mode', async () => {
			const mysqlOptions: DataSourceOptions = {
				type: 'mysql',
				host: 'localhost',
				port: 3306,
				username: 'user',
				password: 'password',
				database: 'n8n',
				migrations,
			};
			connectionOptions.getOptions.mockReturnValue(mysqlOptions);

			const mysqlBinaryDataConfig = mock<BinaryDataConfig>({
				availableModes: ['database'],
				dbMaxFileSize: 512,
			});

			const mysqlDbConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				mysqlBinaryDataConfig,
			);

			// @ts-expect-error accessing private property for testing
			const mysqlDataSource = mysqlDbConnection.dataSource as jest.Mocked<DataSource>;
			mysqlDataSource.initialize = jest.fn().mockResolvedValue(mysqlDataSource);
			mysqlDataSource.query = jest.fn().mockResolvedValue(undefined);
			// @ts-expect-error mock options
			mysqlDataSource.options = { migrations, type: 'mysql' };

			await mysqlDbConnection.init();

			expect(mysqlDataSource.query).toHaveBeenCalledWith(
				'SET GLOBAL max_allowed_packet = 536870912',
			);
		});

		it('should log warning when setting max_allowed_packet fails for mysql', async () => {
			const mysqlOptions: DataSourceOptions = {
				type: 'mysql',
				host: 'localhost',
				port: 3306,
				username: 'user',
				password: 'password',
				database: 'n8n',
				migrations,
			};
			connectionOptions.getOptions.mockReturnValue(mysqlOptions);

			const mysqlBinaryDataConfig = mock<BinaryDataConfig>({
				availableModes: ['database'],
				dbMaxFileSize: 512,
			});

			const mysqlDbConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				mysqlBinaryDataConfig,
			);

			// @ts-expect-error accessing private property for testing
			const mysqlDataSource = mysqlDbConnection.dataSource as jest.Mocked<DataSource>;
			mysqlDataSource.initialize = jest.fn().mockResolvedValue(mysqlDataSource);
			mysqlDataSource.query = jest.fn().mockRejectedValue(new Error('Permission denied'));
			// @ts-expect-error mock options
			mysqlDataSource.options = { migrations, type: 'mysql' };

			await mysqlDbConnection.init();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Failed to set `max_allowed_packet`'),
			);
		});
	});

	describe('migrate', () => {
		it('should wrap migrations and run them', async () => {
			dataSource.runMigrations.mockResolvedValue([]);

			const wrapMigrationSpy = jest.spyOn(migrationHelper, 'wrapMigration').mockImplementation();

			expect(dataSource.runMigrations).not.toHaveBeenCalled();
			expect(dbConnection.connectionState.migrated).toBe(false);

			await dbConnection.migrate();

			expect(wrapMigrationSpy).toHaveBeenCalledTimes(2);
			expect(dataSource.runMigrations).toHaveBeenCalledWith({ transaction: 'each' });
			expect(dbConnection.connectionState.migrated).toBe(true);
		});

		it('should acquire session-level advisory lock for postgres using QueryRunner', async () => {
			dataSource.runMigrations.mockResolvedValue([]);
			jest.spyOn(migrationHelper, 'wrapMigration').mockImplementation();

			await dbConnection.migrate();

			// Should create a dedicated QueryRunner for the lock
			expect(dataSource.createQueryRunner).toHaveBeenCalled();
			// Should acquire and release session-level lock on the same QueryRunner
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock(1850)');
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');
			// Should release the QueryRunner after completion
			expect(mockQueryRunner.release).toHaveBeenCalled();
		});

		it('should release advisory lock and QueryRunner when migrations fail', async () => {
			const migrationError = new Error('Migration failed');
			dataSource.runMigrations.mockRejectedValue(migrationError);
			jest.spyOn(migrationHelper, 'wrapMigration').mockImplementation();

			await expect(dbConnection.migrate()).rejects.toThrow('Migration failed');

			// Lock should have been acquired and released on the same QueryRunner
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock(1850)');
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');
			// QueryRunner should be released even on failure
			expect(mockQueryRunner.release).toHaveBeenCalled();
		});

		it('should not use advisory lock for sqlite', async () => {
			const sqliteOptions: DataSourceOptions = {
				type: 'sqlite',
				database: ':memory:',
				migrations,
			};
			connectionOptions.getOptions.mockReturnValue(sqliteOptions);

			// Create a new instance with sqlite options
			const sqliteDbConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				binaryDataConfig,
			);

			// Get the dataSource from the new instance and mock it
			// @ts-expect-error accessing private property for testing
			const sqliteDataSource = sqliteDbConnection.dataSource as jest.Mocked<DataSource>;
			sqliteDataSource.runMigrations = jest.fn().mockResolvedValue([]);
			sqliteDataSource.createQueryRunner = jest.fn();
			// @ts-expect-error mock options
			sqliteDataSource.options = { migrations, type: 'sqlite' };

			jest.spyOn(migrationHelper, 'wrapMigration').mockImplementation();

			await sqliteDbConnection.migrate();

			// Should not create QueryRunner for SQLite (no advisory lock support)
			expect(sqliteDataSource.createQueryRunner).not.toHaveBeenCalled();
		});
	});

	describe('withAdvisoryLock', () => {
		it('should use dedicated QueryRunner for lock/unlock to ensure same connection', async () => {
			const mockFn = jest.fn().mockResolvedValue('result');

			await dbConnection.withAdvisoryLock(mockFn);

			// Should create a dedicated QueryRunner
			expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
			// Should acquire and release lock on the same QueryRunner (ensures same connection)
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock(1850)');
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');
			// Should release QueryRunner after completion
			expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
		});

		it('should return the result from the callback function', async () => {
			const expectedResult = { data: 'test' };
			const mockFn = jest.fn().mockResolvedValue(expectedResult);

			const result = await dbConnection.withAdvisoryLock(mockFn);

			expect(result).toEqual(expectedResult);
		});

		it('should release advisory lock and QueryRunner when callback fails', async () => {
			const mockError = new Error('Callback failed');
			const mockFn = jest.fn().mockRejectedValue(mockError);

			await expect(dbConnection.withAdvisoryLock(mockFn)).rejects.toThrow('Callback failed');

			// Lock should have been acquired and released on same QueryRunner
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock(1850)');
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');
			// QueryRunner should be released even on failure
			expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
		});

		it('should release QueryRunner without unlocking when lock acquisition times out', async () => {
			jest.useFakeTimers();

			// Mock lock always returning false (lock not acquired)
			// eslint-disable-next-line @typescript-eslint/naming-convention
			mockQueryRunner.query.mockResolvedValue([{ pg_try_advisory_lock: false }]);

			const mockFn = jest.fn().mockResolvedValue('result');
			const lockPromise = dbConnection.withAdvisoryLock(mockFn);

			// Advance time past the timeout (30 seconds)
			await jest.advanceTimersByTimeAsync(31_000);

			await expect(lockPromise).rejects.toThrow(OperationalError);
			await expect(lockPromise).rejects.toThrow(/Failed to acquire database advisory lock/);
			await expect(lockPromise).rejects.toThrow(/auto-release/);
			await expect(lockPromise).rejects.toThrow(/pg_terminate_backend/);

			// Function should never have been called
			expect(mockFn).not.toHaveBeenCalled();
			// QueryRunner should still be released on timeout
			expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
			// Should NOT try to unlock since lock was never acquired
			expect(mockQueryRunner.query).not.toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');

			jest.useRealTimers();
		});

		it('should retry and succeed when lock becomes available', async () => {
			jest.useFakeTimers();

			// First call returns false, second returns true
			mockQueryRunner.query
				// eslint-disable-next-line @typescript-eslint/naming-convention
				.mockResolvedValueOnce([{ pg_try_advisory_lock: false }])
				// eslint-disable-next-line @typescript-eslint/naming-convention
				.mockResolvedValueOnce([{ pg_try_advisory_lock: true }]);

			const mockFn = jest.fn().mockResolvedValue('result');
			const lockPromise = dbConnection.withAdvisoryLock(mockFn);

			// Advance time to trigger retry
			await jest.advanceTimersByTimeAsync(600);

			const result = await lockPromise;

			expect(result).toBe('result');
			expect(mockFn).toHaveBeenCalled();
			// Should explicitly unlock on the same QueryRunner
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');
			expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);

			jest.useRealTimers();
		});

		it('should treat empty query result as lock not acquired', async () => {
			jest.useFakeTimers();

			// First call returns empty array (edge case), second returns true
			mockQueryRunner.query
				.mockResolvedValueOnce([]) // Empty result - should default to false
				// eslint-disable-next-line @typescript-eslint/naming-convention
				.mockResolvedValueOnce([{ pg_try_advisory_lock: true }]);

			const mockFn = jest.fn().mockResolvedValue('result');
			const lockPromise = dbConnection.withAdvisoryLock(mockFn);

			// Advance time to trigger retry
			await jest.advanceTimersByTimeAsync(600);

			const result = await lockPromise;

			expect(result).toBe('result');
			// 2 calls for lock attempts + 1 for unlock
			expect(mockQueryRunner.query).toHaveBeenCalledTimes(3);

			jest.useRealTimers();
		});

		it('should not use advisory lock or QueryRunner for sqlite', async () => {
			const sqliteOptions: DataSourceOptions = {
				type: 'sqlite',
				database: ':memory:',
				migrations,
			};
			connectionOptions.getOptions.mockReturnValue(sqliteOptions);

			const sqliteDbConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				binaryDataConfig,
			);

			// @ts-expect-error accessing private property for testing
			const sqliteDataSource = sqliteDbConnection.dataSource as jest.Mocked<DataSource>;
			sqliteDataSource.createQueryRunner = jest.fn();
			// @ts-expect-error mock options
			sqliteDataSource.options = { migrations, type: 'sqlite' };

			const mockFn = jest.fn().mockResolvedValue('result');

			await sqliteDbConnection.withAdvisoryLock(mockFn);

			expect(mockFn).toHaveBeenCalled();
			// Should not create QueryRunner for SQLite (no advisory lock support)
			expect(sqliteDataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it('should verify lock is acquired before function runs and released after', async () => {
			const callOrder: string[] = [];

			mockQueryRunner.query.mockImplementation(async (sql: string) => {
				if (sql.includes('pg_try_advisory_lock')) {
					callOrder.push('lock');
					// eslint-disable-next-line @typescript-eslint/naming-convention
					return [{ pg_try_advisory_lock: true }];
				}
				if (sql.includes('pg_advisory_unlock')) {
					callOrder.push('unlock');
					return [];
				}
				return [];
			});

			const mockFn = jest.fn().mockImplementation(async () => {
				callOrder.push('function');
				return 'result';
			});

			await dbConnection.withAdvisoryLock(mockFn);

			expect(callOrder).toEqual(['lock', 'function', 'unlock']);
		});

		it('should still release QueryRunner if unlock query fails', async () => {
			mockQueryRunner.query.mockImplementation(async (sql: string) => {
				if (sql.includes('pg_try_advisory_lock')) {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					return [{ pg_try_advisory_lock: true }];
				}
				if (sql.includes('pg_advisory_unlock')) {
					throw new Error('Connection dropped');
				}
				return [];
			});

			const mockFn = jest.fn().mockResolvedValue('result');
			const result = await dbConnection.withAdvisoryLock(mockFn);

			// Should still succeed - unlock errors are swallowed
			expect(result).toBe('result');
			// QueryRunner should still be released
			expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
		});

		it('should not use advisory lock or QueryRunner for mysql', async () => {
			const mysqlOptions: DataSourceOptions = {
				type: 'mysql',
				host: 'localhost',
				port: 3306,
				username: 'user',
				password: 'password',
				database: 'n8n',
				migrations,
			};
			connectionOptions.getOptions.mockReturnValue(mysqlOptions);

			const mysqlDbConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				binaryDataConfig,
			);

			// @ts-expect-error accessing private property for testing
			const mysqlDataSource = mysqlDbConnection.dataSource as jest.Mocked<DataSource>;
			mysqlDataSource.createQueryRunner = jest.fn();
			// @ts-expect-error mock options
			mysqlDataSource.options = { migrations, type: 'mysql' };

			const mockFn = jest.fn().mockResolvedValue('result');

			await mysqlDbConnection.withAdvisoryLock(mockFn);

			expect(mockFn).toHaveBeenCalled();
			// Should not create QueryRunner for MySQL (no advisory lock support)
			expect(mysqlDataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it('should not use advisory lock or QueryRunner for mariadb', async () => {
			const mariadbOptions: DataSourceOptions = {
				type: 'mariadb',
				host: 'localhost',
				port: 3306,
				username: 'user',
				password: 'password',
				database: 'n8n',
				migrations,
			};
			connectionOptions.getOptions.mockReturnValue(mariadbOptions);

			const mariadbDbConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				binaryDataConfig,
			);

			// @ts-expect-error accessing private property for testing
			const mariadbDataSource = mariadbDbConnection.dataSource as jest.Mocked<DataSource>;
			mariadbDataSource.createQueryRunner = jest.fn();
			// @ts-expect-error mock options
			mariadbDataSource.options = { migrations, type: 'mariadb' };

			const mockFn = jest.fn().mockResolvedValue('result');

			await mariadbDbConnection.withAdvisoryLock(mockFn);

			expect(mockFn).toHaveBeenCalled();
			// Should not create QueryRunner for MariaDB (no advisory lock support)
			expect(mariadbDataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it('should not use advisory lock when postgres pool size is 1', async () => {
			const postgresPoolSize1Options: DataSourceOptions = {
				type: 'postgres',
				host: 'localhost',
				port: 5432,
				username: 'user',
				password: 'password',
				database: 'n8n',
				poolSize: 1,
				migrations,
			};
			connectionOptions.getOptions.mockReturnValue(postgresPoolSize1Options);

			const poolSize1DbConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				binaryDataConfig,
			);

			// @ts-expect-error accessing private property for testing
			const poolSize1DataSource = poolSize1DbConnection.dataSource as jest.Mocked<DataSource>;
			poolSize1DataSource.createQueryRunner = jest.fn();
			// @ts-expect-error mock options
			poolSize1DataSource.options = { migrations, type: 'postgres', poolSize: 1 };

			const mockFn = jest.fn().mockResolvedValue('result');

			const result = await poolSize1DbConnection.withAdvisoryLock(mockFn);

			expect(result).toBe('result');
			expect(mockFn).toHaveBeenCalled();
			// Should NOT create QueryRunner when pool size is 1 - the pool itself acts as a lock
			expect(poolSize1DataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it('should use advisory lock when postgres pool size is greater than 1', async () => {
			const postgresPoolSize2Options: DataSourceOptions = {
				type: 'postgres',
				host: 'localhost',
				port: 5432,
				username: 'user',
				password: 'password',
				database: 'n8n',
				poolSize: 2,
				migrations,
			};
			connectionOptions.getOptions.mockReturnValue(postgresPoolSize2Options);

			const poolSize2DbConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				binaryDataConfig,
			);

			// @ts-expect-error accessing private property for testing
			const poolSize2DataSource = poolSize2DbConnection.dataSource as jest.Mocked<DataSource>;
			// @ts-expect-error mock options
			poolSize2DataSource.options = { migrations, type: 'postgres', poolSize: 2 };
			poolSize2DataSource.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

			const mockFn = jest.fn().mockResolvedValue('result');

			const result = await poolSize2DbConnection.withAdvisoryLock(mockFn);

			expect(result).toBe('result');
			expect(mockFn).toHaveBeenCalled();
			// Should create QueryRunner for pool size > 1
			expect(poolSize2DataSource.createQueryRunner).toHaveBeenCalled();
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock(1850)');
			expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');
			expect(mockQueryRunner.release).toHaveBeenCalled();
		});
	});

	describe('close', () => {
		it('should clear the ping timer', async () => {
			const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
			// @ts-expect-error private property
			dbConnection.pingTimer = setTimeout(() => {}, 1000);

			await dbConnection.close();

			expect(clearTimeoutSpy).toHaveBeenCalled();
			// @ts-expect-error private property
			expect(dbConnection.pingTimer).toBeUndefined();
		});

		it('should destroy the data source if initialized', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;

			await dbConnection.close();

			expect(dataSource.destroy).toHaveBeenCalled();
		});

		it('should not try to destroy the data source if not initialized', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = false;

			await dbConnection.close();

			expect(dataSource.destroy).not.toHaveBeenCalled();
		});
	});

	describe('ping', () => {
		it('should update connection state on successful ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// eslint-disable-next-line @typescript-eslint/naming-convention
			dataSource.query.mockResolvedValue([{ '1': 1 }]);
			dbConnection.connectionState.connected = false;

			// @ts-expect-error private property
			await dbConnection.ping();

			expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
			expect(dbConnection.connectionState.connected).toBe(true);
		});

		it('should report errors on failed ping', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			const error = new Error('Connection error');
			dataSource.query.mockRejectedValue(error);

			// @ts-expect-error private property
			await dbConnection.ping();

			expect(errorReporter.error).toHaveBeenCalledWith(error);
		});

		it('should log warning for OperationalError on ping failure', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			const error = new OperationalError('Database connection timed out');
			dataSource.query.mockRejectedValue(error);

			// @ts-expect-error private property
			await dbConnection.ping();

			expect(logger.warn).toHaveBeenCalledWith('Database connection timed out');
			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		it('should timeout and throw OperationalError if ping takes too long', async () => {
			jest.useFakeTimers();
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// Make the query hang indefinitely until aborted
			dataSource.query.mockImplementation(
				async () =>
					await new Promise((_, reject) => {
						// This promise will be rejected when the AbortController aborts
						setTimeout(() => reject(new Error('Query was aborted')), 10000);
					}),
			);

			// @ts-expect-error private property
			const pingPromise = dbConnection.ping();

			// Advance time past the 5 second timeout
			await jest.advanceTimersByTimeAsync(5001);

			await pingPromise;

			// After timeout, connection state should be false and warning logged
			expect(dbConnection.connectionState.connected).toBe(false);
			expect(logger.warn).toHaveBeenCalledWith('Database connection timed out');

			jest.useRealTimers();
		}, 10000);

		it('should schedule next ping after execution', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			// eslint-disable-next-line @typescript-eslint/naming-convention
			dataSource.query.mockResolvedValue([{ '1': 1 }]);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const scheduleNextPingSpy = jest.spyOn(dbConnection as any, 'scheduleNextPing');

			// @ts-expect-error private property
			await dbConnection.ping();

			expect(scheduleNextPingSpy).toHaveBeenCalled();
		});

		it('should not query if data source is not initialized', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = false;

			// @ts-expect-error private property
			await dbConnection.ping();

			expect(dataSource.query).not.toHaveBeenCalled();
		});

		it('should execute ping on schedule', () => {
			jest.useFakeTimers();
			try {
				// ARRANGE
				dbConnection = new DbConnection(
					errorReporter,
					connectionOptions,
					mock<DatabaseConfig>({
						pingIntervalSeconds: 1,
					}),
					logger,
					binaryDataConfig,
				);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const pingSpy = jest.spyOn(dbConnection as any, 'ping');

				// @ts-expect-error private property
				dbConnection.scheduleNextPing();
				jest.advanceTimersByTime(1000);

				expect(pingSpy).toHaveBeenCalled();
			} finally {
				jest.useRealTimers();
			}
		});
	});
});
