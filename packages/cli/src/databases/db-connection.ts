import { Container, Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError, ensureError } from 'n8n-workflow';

import { inTest } from '@/constants';

import { getConnectionOptions, arePostgresOptions } from './config';
import type { Migration } from './types';
import { wrapMigration } from './utils/migration-helpers';

type ConnectionState = {
	connected: boolean;
	migrated: boolean;
};

@Service()
export class DBConnection {
	private dataSource: DataSource;

	private pingTimer: NodeJS.Timer | undefined;

	readonly connectionState: ConnectionState = {
		connected: false,
		migrated: false,
	};

	constructor(private readonly errorReporter: ErrorReporter) {
		if (!inTest) this.scheduleNextPing();
	}

	async init(): Promise<void> {
		if (this.connectionState.connected) return;

		const connectionOptions = getConnectionOptions();
		this.dataSource = new DataSource(connectionOptions);
		Container.set(DataSource, this.dataSource);

		try {
			await this.dataSource.initialize();
		} catch (e) {
			let error = ensureError(e);
			if (
				arePostgresOptions(connectionOptions) &&
				error.message === 'Connection terminated due to connection timeout'
			) {
				error = new DbConnectionTimeoutError({
					cause: error,
					configuredTimeoutInMs: connectionOptions.connectTimeoutMS!,
				});
			}

			throw error;
		}

		this.connectionState.connected = true;
	}

	async migrate() {
		(this.dataSource.options.migrations as Migration[]).forEach(wrapMigration);
		await this.dataSource.runMigrations({ transaction: 'each' });
		this.connectionState.migrated = true;
	}

	async close() {
		if (this.pingTimer) {
			clearTimeout(this.pingTimer);
			this.pingTimer = undefined;
		}

		if (this.dataSource.isInitialized) await this.dataSource.destroy();
	}

	/** Ping DB connection every 2 seconds */
	private scheduleNextPing() {
		this.pingTimer = setTimeout(async () => await this.ping(), 2000);
	}

	private async ping() {
		if (!this.dataSource?.isInitialized) return;
		try {
			await this.dataSource.query('SELECT 1');
			this.connectionState.connected = true;
			return;
		} catch (error) {
			this.errorReporter.error(error);
		} finally {
			this.scheduleNextPing();
		}
	}
}
