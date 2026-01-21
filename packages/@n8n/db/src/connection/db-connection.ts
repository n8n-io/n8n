import { inTest, Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Memoized } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { BinaryDataConfig, ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError, ensureError, OperationalError } from 'n8n-workflow';
import { setTimeout as setTimeoutP } from 'timers/promises';
import * as sqliteVec from 'sqlite-vec';

import { DbConnectionOptions } from './db-connection-options';
import { wrapMigration } from '../migrations/migration-helpers';
import type { Migration } from '../migrations/migration-types';

type ConnectionState = {
	connected: boolean;
	migrated: boolean;
};

@Service()
export class DbConnection {
	private dataSource: DataSource;

	private pingTimer: NodeJS.Timeout | undefined;

	readonly connectionState: ConnectionState = {
		connected: false,
		migrated: false,
	};

	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly connectionOptions: DbConnectionOptions,
		private readonly databaseConfig: DatabaseConfig,
		private readonly logger: Logger,
		private readonly binaryDataConfig: BinaryDataConfig,
	) {
		this.dataSource = new DataSource(this.options);
		Container.set(DataSource, this.dataSource);
	}

	@Memoized
	get options() {
		return this.connectionOptions.getOptions();
	}

	async init(): Promise<void> {
		const { connectionState, options } = this;
		if (connectionState.connected) return;
		try {
			await this.dataSource.initialize();
		} catch (e) {
			let error = ensureError(e);
			if (
				options.type === 'postgres' &&
				error.message === 'Connection terminated due to connection timeout'
			) {
				error = new DbConnectionTimeoutError({
					cause: error,
					configuredTimeoutInMs: options.connectTimeoutMS!,
				});
			}
			throw error;
		}

		if (
			(options.type === 'mysql' || options.type === 'mariadb') &&
			this.binaryDataConfig.availableModes.includes('database')
		) {
			const maxAllowedPacket = this.binaryDataConfig.dbMaxFileSize * 1024 * 1024;
			try {
				await this.dataSource.query(`SET GLOBAL max_allowed_packet = ${maxAllowedPacket}`);
			} catch {
				this.logger.warn(
					`Failed to set \`max_allowed_packet\` to ${maxAllowedPacket} bytes on your MySQL server. ` +
						`Please set \`max_allowed_packet\` to at least ${this.binaryDataConfig.dbMaxFileSize} MiB in your MySQL server configuration.`,
				);
			}
		}

		this.logger.info(`Database type detected: ${options.type}`);

		if (options.type === 'sqlite' || options.type === 'sqlite-pooled') {
			this.logger.info('Entering sqlite-vec loading block');
			try {
				if (options.type === 'sqlite-pooled') {
					// For pooled connections, intercept connection creation to auto-load extension
					this.logger.info('Setting up sqlite-vec auto-loading for pooled connections');
					const driver = this.dataSource.driver as any;

					// Patch the SqliteLibrary to auto-load extension on every new connection
					const originalNewDatabase = driver.sqliteLibrary.sqlite.Database;
					const logger = this.logger;
					const extensionLoadWrapper = function (this: any, ...args: any[]) {
						console.log('[sqlite-vec] New Database connection being created');

						// Wrap the callback to load extension BEFORE creating the database
						let dbRef: any;
						if (typeof args[args.length - 1] === 'function') {
							console.log('[sqlite-vec] Connection has callback, wrapping it');
							const originalCallback = args[args.length - 1];
							args[args.length - 1] = function (err: any) {
								if (!err && dbRef) {
									try {
										sqliteVec.load(dbRef);
										console.log('[sqlite-vec] Extension loaded on new connection via callback');
									} catch (loadErr) {
										console.error('[sqlite-vec] Failed to auto-load sqlite-vec:', loadErr);
									}
								}
								originalCallback.call(this, err);
							};
						}

						// Now create the database with the wrapped callback
						const db = new originalNewDatabase(...args);
						dbRef = db;

						// If no callback, load immediately
						if (typeof args[args.length - 1] !== 'function') {
							console.log('[sqlite-vec] No callback, loading immediately');
							try {
								sqliteVec.load(db);
								console.log('[sqlite-vec] Extension loaded on new connection immediately');
							} catch (loadErr) {
								console.error('[sqlite-vec] Failed to immediately load sqlite-vec:', loadErr);
							}
						}

						return db;
					};

					driver.sqliteLibrary.sqlite.Database = extensionLoadWrapper as any;
					this.logger.info('sqlite-vec auto-loading configured for all new connections');

					// Also load on existing connections
					const writeConnection = driver.writeConnection;
					if (writeConnection) {
						const dbLease = await writeConnection.leaseConnection({
							id: 'sqlite-vec-loader-write',
						});
						try {
							const db = dbLease.connection || dbLease.db || dbLease;
							sqliteVec.load(db);
							this.logger.info('sqlite-vec extension loaded on write connection');
						} finally {
							await writeConnection.releaseConnection(dbLease);
						}
					}

					const readonlyPool = driver.readonlyPool;
					if (readonlyPool) {
						const poolSize = options.poolSize || 5;
						this.logger.info(`Loading sqlite-vec on ${poolSize} readonly pool connections`);
						const readLeases = [];

						for (let i = 0; i < poolSize; i++) {
							try {
								const readLease = await readonlyPool.leaseConnection({
									id: `sqlite-vec-loader-read-${i}`,
								});
								readLeases.push(readLease);
								const db = readLease.connection || readLease.db || readLease;
								sqliteVec.load(db);
								this.logger.info(`sqlite-vec loaded on readonly connection ${i}`);
							} catch (error) {
								const err = ensureError(error);
								this.logger.error(`Failed to load sqlite-vec on readonly connection ${i}`, {
									error: err.message,
									stack: err.stack,
								});
								break;
							}
						}

						this.logger.info(`Loaded sqlite-vec on ${readLeases.length} readonly connections`);

						for (const lease of readLeases) {
							await readonlyPool.releaseConnection(lease);
						}
					} else {
						this.logger.warn(
							'No readonly pool found - this might cause issues with vector queries',
						);
					}

					this.logger.info('sqlite-vec extension loaded successfully');
				} else {
					// For regular sqlite, use the programmatic API
					const driver = this.dataSource.driver as {
						databaseConnection?: { loadExtension: (file: string, entrypoint?: string) => void };
					};

					this.logger.info('Attempting to load sqlite-vec extension programmatically');

					if (!driver.databaseConnection) {
						throw new Error('No database connection found on driver');
					}

					if (!driver.databaseConnection.loadExtension) {
						throw new Error('loadExtension method not available on database connection');
					}

					sqliteVec.load(driver.databaseConnection);
					this.logger.info('sqlite-vec extension loaded successfully');
				}
			} catch (error) {
				const err = ensureError(error);
				console.error('!!! SQLITE-VEC LOADING ERROR !!!');
				console.error('Error:', err.message);
				console.error('Stack:', err.stack);
				this.logger.error(
					'Failed to load sqlite-vec extension. Vector store persistence may not work correctly.',
					{
						error: err.message,
						stack: err.stack,
					},
				);
			}
		}

		connectionState.connected = true;
		if (!inTest) this.scheduleNextPing();
	}

	async migrate() {
		const { dataSource, connectionState } = this;
		(dataSource.options.migrations as Migration[]).forEach(wrapMigration);
		await dataSource.runMigrations({ transaction: 'each' });
		connectionState.migrated = true;
	}

	async close() {
		if (this.pingTimer) {
			clearTimeout(this.pingTimer);
			this.pingTimer = undefined;
		}

		if (this.dataSource.isInitialized) {
			await this.dataSource.destroy();
			this.connectionState.connected = false;
		}
	}

	/** Ping DB connection every `pingIntervalSeconds` seconds to check if it is still alive. */
	private scheduleNextPing() {
		this.pingTimer = setTimeout(
			async () => await this.ping(),
			this.databaseConfig.pingIntervalSeconds * Time.seconds.toMilliseconds,
		);
	}

	private async ping() {
		if (!this.dataSource.isInitialized) return;
		const abortController = new AbortController();

		try {
			await Promise.race([
				this.dataSource.query('SELECT 1'),
				setTimeoutP(5000, undefined, { signal: abortController.signal }).then(() => {
					throw new OperationalError('Database connection timed out');
				}),
			]);

			if (!this.connectionState.connected) {
				this.logger.info('Database connection recovered');
			}

			this.connectionState.connected = true;
			return;
		} catch (error) {
			this.connectionState.connected = false;
			if (error instanceof OperationalError) {
				this.logger.warn(error.message);
			} else {
				this.errorReporter.error(error);
			}
		} finally {
			abortController.abort();
			this.scheduleNextPing();
		}
	}
}
