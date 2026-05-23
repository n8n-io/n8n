import { Logger } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import { Memoized } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError, ensureError } from 'n8n-workflow';

import { DbConnectionMonitor } from './db-connection-monitor';
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

	private monitor: DbConnectionMonitor | undefined;

	readonly connectionState: ConnectionState = {
		connected: false,
		migrated: false,
	};

	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly connectionOptions: DbConnectionOptions,
		private readonly databaseConfig: DatabaseConfig,
		private readonly logger: Logger,
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

		if (process.env.N8N_DB_PING_TIMEOUT) {
			this.logger.warn(
				'N8N_DB_PING_TIMEOUT is deprecated, use DB_PING_TIMEOUT_MS instead. The legacy variable will be removed in a future release.',
			);
		}

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

		connectionState.connected = true;
		this.monitor = new DbConnectionMonitor(
			this.dataSource,
			(connected) => (this.connectionState.connected = connected),
			this.databaseConfig,
			this.logger,
			this.errorReporter,
			connectionState.connected,
		);
		this.monitor.start();
	}

	async migrate() {
		const { dataSource, connectionState } = this;
		(dataSource.options.migrations as Migration[]).forEach(wrapMigration);
		await dataSource.runMigrations({ transaction: 'each' });
		connectionState.migrated = true;
	}

	async close() {
		this.monitor?.stop();
		this.monitor = undefined;

		if (this.dataSource.isInitialized) {
			await this.dataSource.destroy();
			this.connectionState.connected = false;
		}
	}
}
