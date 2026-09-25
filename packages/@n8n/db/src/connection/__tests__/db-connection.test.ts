/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import {
	DataSource,
	MigrationExecutor,
	type DataSourceOptions,
	type EntityManager,
	type QueryRunner,
} from '@n8n/typeorm';
import type { ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import type { Mock } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as migrationHelper from '../../migrations/migration-helpers';
import type { Migration } from '../../migrations/migration-types';
import { DbLock, DbLockService } from '../../services/db-lock.service';
import { DbConnection } from '../db-connection';
import type { DbConnectionMetrics } from '../db-connection-metrics';
import { DbConnectionMonitor } from '../db-connection-monitor';
import type { DbConnectionOptions } from '../db-connection-options';

vi.mock('@n8n/typeorm', async () => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await vi.importActual<typeof import('@n8n/typeorm')>('@n8n/typeorm')),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	DataSource: vi.fn(),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	MigrationExecutor: vi.fn(),
}));

vi.mock('../db-connection-monitor');

vi.mock('timers/promises', async () => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await vi.importActual<typeof import('timers/promises')>('timers/promises')),
	setTimeout: vi.fn().mockResolvedValue(undefined),
}));

describe('DbConnection', () => {
	let dbConnection: DbConnection;
	const migrations = [{ name: 'TestMigration1' }, { name: 'TestMigration2' }] as Migration[];
	const errorReporter = mock<ErrorReporter>();
	const databaseConfig = mock<DatabaseConfig>();
	const logger = mock<Logger>();
	const dbConnectionMetrics = mock<DbConnectionMetrics>();
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

	const monitor = mock<DbConnectionMonitor>();

	beforeEach(() => {
		vi.resetAllMocks();

		connectionOptions.getOptions.mockReturnValue(postgresOptions);
		// resetAllMocks leaves deep-mock properties in place, so clear the one
		// the version check reads or it leaks a proxy into unrelated tests
		dataSource.driver.version = undefined;
		// Default to legacy single-attempt behavior; retry tests override startupConnectMaxRetries.
		databaseConfig.startupConnectMaxRetries = 0;
		databaseConfig.minRecoveryBackoffMs = 1;
		databaseConfig.maxRecoveryBackoffMs = 1;
		vi.mocked(DbConnectionMonitor).mockImplementation(function () {
			return monitor;
		});
		(DataSource as unknown as Mock) = vi.fn(function () {
			return dataSource;
		});

		dbConnection = new DbConnection(
			errorReporter,
			connectionOptions,
			databaseConfig,
			logger,
			dbConnectionMetrics,
		);
	});

	describe('init', () => {
		it('should initialize the data source', async () => {
			dataSource.initialize.mockResolvedValue(dataSource);

			await dbConnection.init();

			expect(dataSource.initialize).toHaveBeenCalled();
			expect(dbConnection.connectionState.connected).toBe(true);
		});

		it('should start the monitor after a successful init', async () => {
			dataSource.initialize.mockResolvedValue(dataSource);

			await dbConnection.init();

			expect(monitor.start).toHaveBeenCalled();
		});

		it('should warn when the postgres server is below the supported range', async () => {
			dataSource.initialize.mockResolvedValue(dataSource);
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.driver.version = '14.22';

			await dbConnection.init();

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Postgres 14'));
		});

		it('should not warn when the postgres server is supported', async () => {
			dataSource.initialize.mockResolvedValue(dataSource);
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
			dataSource.driver.version = '17.6';

			await dbConnection.init();

			expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Postgres'));
		});

		it('should complete startup even when the version check throws', async () => {
			dataSource.initialize.mockResolvedValue(dataSource);
			// getDbVersion never rejects today; pin that a future regression cannot abort startup
			vi.spyOn(dbConnection, 'getDbVersion').mockRejectedValue(new Error('boom'));

			await dbConnection.init();

			expect(dbConnection.connectionState.connected).toBe(true);
			expect(monitor.start).toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith('Could not check database version: boom');
		});

		it('should not warn about the version on sqlite', async () => {
			connectionOptions.getOptions.mockReturnValue({ type: 'sqlite', database: ':memory:' });
			// options are @Memoized and read in the constructor — re-instantiate
			const sqliteConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				dbConnectionMetrics,
			);
			dataSource.initialize.mockResolvedValue(dataSource);
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;

			await sqliteConnection.init();

			expect(dataSource.query).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Postgres'));
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
			const error = new Error('Some other error');
			dataSource.initialize.mockRejectedValue(error);

			await expect(dbConnection.init()).rejects.toThrow('Some other error');
		});

		it('should retry a transient failure and succeed', async () => {
			databaseConfig.startupConnectMaxRetries = 3;
			dataSource.initialize
				.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'))
				.mockResolvedValue(dataSource);

			await dbConnection.init();

			expect(dataSource.initialize).toHaveBeenCalledTimes(2);
			expect(dbConnection.connectionState.connected).toBe(true);
			expect(monitor.start).toHaveBeenCalled();
		});

		it('should give up after exhausting retries', async () => {
			databaseConfig.startupConnectMaxRetries = 2;
			dataSource.initialize.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

			await expect(dbConnection.init()).rejects.toThrow('getaddrinfo ENOTFOUND');
			expect(dataSource.initialize).toHaveBeenCalledTimes(3);
			expect(dbConnection.connectionState.connected).toBe(false);
		});

		it('should not retry when startupConnectMaxRetries is 0', async () => {
			databaseConfig.startupConnectMaxRetries = 0;
			dataSource.initialize.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

			await expect(dbConnection.init()).rejects.toThrow('getaddrinfo ENOTFOUND');
			expect(dataSource.initialize).toHaveBeenCalledTimes(1);
		});
	});

	describe('migrate', () => {
		const dbLockService = mock<DbLockService>();
		const queryRunner = mock<QueryRunner>();
		const tx = mock<EntityManager>({ queryRunner });
		const migrationExecutor = mock<MigrationExecutor>();
		// Mirrors migrate()'s derivation for the test's schema-less, prefix-less options
		const expectedSubKey = createHash('sha256').update('public:').digest().readInt32BE(0);

		beforeEach(() => {
			Container.set(DbLockService, dbLockService);
			dbLockService.withLock.mockImplementation(async (_lockId, fn) => await fn(tx, {}));
			tx.query.mockResolvedValue([]);
			vi.mocked(MigrationExecutor).mockImplementation(function () {
				return migrationExecutor;
			});
			vi.spyOn(migrationHelper, 'wrapMigration').mockImplementation(() => {});
		});

		it('should run migrations under the migration advisory lock on postgres', async () => {
			expect(dbConnection.connectionState.migrated).toBe(false);

			await dbConnection.migrate();

			expect(migrationHelper.wrapMigration).toHaveBeenCalledTimes(2);
			expect(dbLockService.withLock).toHaveBeenCalledWith(DbLock.MIGRATIONS, expect.any(Function), {
				subKey: expectedSubKey,
				waitIndefinitely: true,
			});
			expect(MigrationExecutor).toHaveBeenCalledWith(dataSource, queryRunner);
			expect(migrationExecutor.transaction).toBe('none');
			expect(migrationExecutor.executePendingMigrations).toHaveBeenCalled();
			expect(dbConnection.connectionState.migrated).toBe(true);
		});

		it('should not override statement_timeout when none is configured', async () => {
			await dbConnection.migrate();

			expect(tx.query).not.toHaveBeenCalled();
		});

		it('should restore the configured statement timeout inside the lock transaction', async () => {
			connectionOptions.getOptions.mockReturnValue({
				...postgresOptions,
				statementTimeout: 300_000,
			});
			const connection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				dbConnectionMetrics,
			);

			await connection.migrate();

			expect(tx.query).toHaveBeenCalledWith('SET LOCAL statement_timeout = 300000');
		});

		it('should propagate migration errors', async () => {
			migrationExecutor.executePendingMigrations.mockRejectedValue(new Error('migration failed'));

			await expect(dbConnection.migrate()).rejects.toThrow('migration failed');

			expect(dbConnection.connectionState.migrated).toBe(false);
		});

		it('should run migrations directly without the lock on sqlite', async () => {
			connectionOptions.getOptions.mockReturnValue({
				type: 'sqlite',
				database: ':memory:',
				migrations,
			});
			// options are @Memoized and read in the constructor — re-instantiate
			const sqliteConnection = new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				dbConnectionMetrics,
			);
			dataSource.runMigrations.mockResolvedValue([]);

			await sqliteConnection.migrate();

			expect(dbLockService.withLock).not.toHaveBeenCalled();
			expect(dataSource.runMigrations).toHaveBeenCalledWith({ transaction: 'each' });
			expect(sqliteConnection.connectionState.migrated).toBe(true);
		});
	});

	describe('getDbVersion', () => {
		const newConnection = (type: 'sqlite' | 'sqlite-pooled' | 'mysql') => {
			connectionOptions.getOptions.mockReturnValue({
				type,
				database: ':memory:',
				migrations,
			} as DataSourceOptions);
			// options are @Memoized and read in the constructor — re-instantiate
			return new DbConnection(
				errorReporter,
				connectionOptions,
				databaseConfig,
				logger,
				dbConnectionMetrics,
			);
		};

		beforeEach(() => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = true;
		});

		it('should return the version the postgres driver resolved on connect', async () => {
			dataSource.driver.version = '16.11';

			await expect(dbConnection.getDbVersion()).resolves.toBe('16.11');
			expect(dataSource.query).not.toHaveBeenCalled();
		});

		it('should return null when the postgres driver has no version', async () => {
			dataSource.driver.version = undefined;

			await expect(dbConnection.getDbVersion()).resolves.toBeNull();
		});

		it.each(['sqlite', 'sqlite-pooled'] as const)(
			'should query the sqlite library version on %s',
			async (type) => {
				dataSource.query.mockResolvedValue([{ version: '3.45.0' }]);

				await expect(newConnection(type).getDbVersion()).resolves.toBe('3.45.0');
				expect(dataSource.query).toHaveBeenCalledWith('SELECT sqlite_version() AS version');
			},
		);

		it('should return null when the sqlite query returns no rows', async () => {
			dataSource.query.mockResolvedValue([]);

			await expect(newConnection('sqlite-pooled').getDbVersion()).resolves.toBeNull();
		});

		it('should return null when the query fails', async () => {
			dataSource.query.mockRejectedValue(new Error('no such function: sqlite_version'));

			await expect(newConnection('sqlite-pooled').getDbVersion()).resolves.toBeNull();
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not determine database version: no such function: sqlite_version',
			);
		});

		it('should return null for a database type n8n does not configure', async () => {
			await expect(newConnection('mysql').getDbVersion()).resolves.toBeNull();
			expect(dataSource.query).not.toHaveBeenCalled();
		});

		it('should return null when the data source is not initialized', async () => {
			// @ts-expect-error readonly property
			dataSource.isInitialized = false;
			dataSource.driver.version = '16.11';

			await expect(dbConnection.getDbVersion()).resolves.toBeNull();
		});
	});

	describe('close', () => {
		it('should stop the monitor', async () => {
			dataSource.initialize.mockResolvedValue(dataSource);
			await dbConnection.init();

			await dbConnection.close();

			expect(monitor.stop).toHaveBeenCalled();
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
});
