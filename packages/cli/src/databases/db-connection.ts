import { inTest } from '@n8n/backend-common';
import { Memoized } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError, ensureError } from 'n8n-workflow';

import { DbConnectionOptions } from './db-connection-options';
import type { Migration } from './types';
import { wrapMigration } from './utils/migration-helpers';

type ConnectionState = {
	connected: boolean;
	migrated: boolean;
};

@Service()
export class DbConnection {
	private dataSource: DataSource;

	private pingTimer: NodeJS.Timer | undefined;

	readonly connectionState: ConnectionState = {
		connected: false,
		migrated: false,
	};

	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly connectionOptions: DbConnectionOptions,
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

	/** Ping DB connection every 2 seconds */
	private scheduleNextPing() {
		this.pingTimer = setTimeout(async () => await this.ping(), 2000);
	}

	private async ping() {
		if (!this.dataSource.isInitialized) return;
		try {
			await this.dataSource.query('SELECT 1');
			this.connectionState.connected = true;
			return;
		} catch (error) {
			this.connectionState.connected = false;
			this.errorReporter.error(error);
		} finally {
			this.scheduleNextPing();
		}
	}
}
