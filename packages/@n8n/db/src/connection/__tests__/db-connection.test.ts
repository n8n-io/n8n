/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import { DataSource, type DataSourceOptions } from '@n8n/typeorm';
import { mock, mockDeep } from 'jest-mock-extended';
import type { BinaryDataConfig, ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError } from 'n8n-workflow';

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

	beforeEach(() => {
		jest.resetAllMocks();

		connectionOptions.getOptions.mockReturnValue(postgresOptions);
		(DataSource as jest.Mock) = jest.fn().mockImplementation(() => dataSource);

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

		it('should acquire and release advisory lock for postgres', async () => {
			dataSource.runMigrations.mockResolvedValue([]);
			jest.spyOn(migrationHelper, 'wrapMigration').mockImplementation();

			await dbConnection.migrate();

			expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_lock(1850)');
			expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');

			// Verify lock is acquired before migrations and released after
			const queryCalls = dataSource.query.mock.calls.map((call) => call[0]);
			const lockIndex = queryCalls.indexOf('SELECT pg_advisory_lock(1850)');
			const unlockIndex = queryCalls.indexOf('SELECT pg_advisory_unlock(1850)');
			expect(lockIndex).toBeLessThan(unlockIndex);
		});

		it('should release advisory lock even if migrations fail', async () => {
			const migrationError = new Error('Migration failed');
			dataSource.runMigrations.mockRejectedValue(migrationError);
			jest.spyOn(migrationHelper, 'wrapMigration').mockImplementation();

			await expect(dbConnection.migrate()).rejects.toThrow('Migration failed');

			expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_lock(1850)');
			expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');
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
			sqliteDataSource.query = jest.fn();
			// @ts-expect-error mock options
			sqliteDataSource.options = { migrations, type: 'sqlite' };

			jest.spyOn(migrationHelper, 'wrapMigration').mockImplementation();

			await sqliteDbConnection.migrate();

			expect(sqliteDataSource.query).not.toHaveBeenCalledWith(
				expect.stringContaining('pg_advisory_lock'),
			);
			expect(sqliteDataSource.query).not.toHaveBeenCalledWith(
				expect.stringContaining('pg_advisory_unlock'),
			);
		});
	});

	describe('withAdvisoryLock', () => {
		it('should acquire and release advisory lock for postgres', async () => {
			const mockFn = jest.fn().mockResolvedValue('result');

			await dbConnection.withAdvisoryLock(mockFn);

			expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_lock(1850)');
			expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');

			// Verify lock is acquired before function runs and released after
			const queryCalls = dataSource.query.mock.calls.map((call) => call[0]);
			const lockIndex = queryCalls.indexOf('SELECT pg_advisory_lock(1850)');
			const unlockIndex = queryCalls.indexOf('SELECT pg_advisory_unlock(1850)');
			expect(lockIndex).toBeLessThan(unlockIndex);
		});

		it('should return the result from the callback function', async () => {
			const expectedResult = { data: 'test' };
			const mockFn = jest.fn().mockResolvedValue(expectedResult);

			const result = await dbConnection.withAdvisoryLock(mockFn);

			expect(result).toEqual(expectedResult);
		});

		it('should release advisory lock even if callback fails', async () => {
			const mockError = new Error('Callback failed');
			const mockFn = jest.fn().mockRejectedValue(mockError);

			await expect(dbConnection.withAdvisoryLock(mockFn)).rejects.toThrow('Callback failed');

			expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_lock(1850)');
			expect(dataSource.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock(1850)');
		});

		it('should not use advisory lock for sqlite', async () => {
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
			sqliteDataSource.query = jest.fn();
			// @ts-expect-error mock options
			sqliteDataSource.options = { migrations, type: 'sqlite' };

			const mockFn = jest.fn().mockResolvedValue('result');

			await sqliteDbConnection.withAdvisoryLock(mockFn);

			expect(mockFn).toHaveBeenCalled();
			expect(sqliteDataSource.query).not.toHaveBeenCalledWith(
				expect.stringContaining('pg_advisory_lock'),
			);
			expect(sqliteDataSource.query).not.toHaveBeenCalledWith(
				expect.stringContaining('pg_advisory_unlock'),
			);
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
