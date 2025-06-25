import type { DatabaseConfig } from '@n8n/config';
import { DataSource, type DataSourceOptions } from '@n8n/typeorm';
import { mock, mockDeep } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError } from 'n8n-workflow';

import * as migrationHelper from '../../migrations/migration-helpers';
import type { Migration } from '../../migrations/migration-types';
import { DbConnection } from '../db-connection';
import type { DbConnectionOptions } from '../db-connection-options';

jest.mock('@n8n/typeorm', () => ({
	DataSource: jest.fn(),
	...jest.requireActual('@n8n/typeorm'),
}));

describe('DbConnection', () => {
	let dbConnection: DbConnection;
	const migrations = [{ name: 'TestMigration1' }, { name: 'TestMigration2' }] as Migration[];
	const errorReporter = mock<ErrorReporter>();
	const databaseConfig = mock<DatabaseConfig>();
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

		dbConnection = new DbConnection(errorReporter, connectionOptions, databaseConfig);
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

		it('should execute ping on schedule', async () => {
			jest.useFakeTimers();
			try {
				// ARRANGE
				dbConnection = new DbConnection(
					errorReporter,
					connectionOptions,
					mock<DatabaseConfig>({
						pingIntervalSeconds: 1,
					}),
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
