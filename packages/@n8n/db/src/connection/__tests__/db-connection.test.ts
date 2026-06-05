/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import { DataSource, type DataSourceOptions } from '@n8n/typeorm';
import type { ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as migrationHelper from '../../migrations/migration-helpers';
import type { Migration } from '../../migrations/migration-types';
import { DbConnection } from '../db-connection';
import { DbConnectionMonitor } from '../db-connection-monitor';
import type { DbConnectionOptions } from '../db-connection-options';

vi.mock('@n8n/typeorm', async () => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await vi.importActual<typeof import('@n8n/typeorm')>('@n8n/typeorm')),
	// eslint-disable-next-line @typescript-eslint/naming-convention
	DataSource: vi.fn(),
}));

vi.mock('../db-connection-monitor');

describe('DbConnection', () => {
	let dbConnection: DbConnection;
	const migrations = [{ name: 'TestMigration1' }, { name: 'TestMigration2' }] as Migration[];
	const errorReporter = mock<ErrorReporter>();
	const databaseConfig = mock<DatabaseConfig>();
	const logger = mock<Logger>();
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
		vi.mocked(DbConnectionMonitor).mockImplementation(function () {
			return monitor;
		});
		(DataSource as unknown as Mock) = vi.fn(function () {
			return dataSource;
		});

		dbConnection = new DbConnection(errorReporter, connectionOptions, databaseConfig, logger);
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
	});

	describe('migrate', () => {
		it('should wrap migrations and run them', async () => {
			dataSource.runMigrations.mockResolvedValue([]);

			const wrapMigrationSpy = vi
				.spyOn(migrationHelper, 'wrapMigration')
				.mockImplementation(() => {});

			expect(dataSource.runMigrations).not.toHaveBeenCalled();
			expect(dbConnection.connectionState.migrated).toBe(false);

			await dbConnection.migrate();

			expect(wrapMigrationSpy).toHaveBeenCalledTimes(2);
			expect(dataSource.runMigrations).toHaveBeenCalledWith({ transaction: 'each' });
			expect(dbConnection.connectionState.migrated).toBe(true);
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
