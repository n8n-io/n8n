import { Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource as Connection } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import { DbConnectionTimeoutError, ensureError } from 'n8n-workflow';

import { inTest } from '@/constants';
import { getConnectionOptions, arePostgresOptions } from '@/databases/config';
import type { Migration } from '@/databases/types';
import { wrapMigration } from '@/databases/utils/migration-helpers';

let connection: Connection;

export const getConnection = () => connection!;

type ConnectionState = {
	connected: boolean;
	migrated: boolean;
};

export const connectionState: ConnectionState = {
	connected: false,
	migrated: false,
};

// Ping DB connection every 2 seconds
let pingTimer: NodeJS.Timer | undefined;
if (!inTest) {
	const pingDBFn = async () => {
		if (connection?.isInitialized) {
			try {
				await connection.query('SELECT 1');
				connectionState.connected = true;
				return;
			} catch (error) {
				Container.get(ErrorReporter).error(error);
			} finally {
				pingTimer = setTimeout(pingDBFn, 2000);
			}
		}
		connectionState.connected = false;
	};
	pingTimer = setTimeout(pingDBFn, 2000);
}

export async function transaction<T>(fn: (entityManager: EntityManager) => Promise<T>): Promise<T> {
	return await connection.transaction(fn);
}

export async function init(): Promise<void> {
	if (connectionState.connected) return;

	const connectionOptions = getConnectionOptions();
	connection = new Connection(connectionOptions);
	Container.set(Connection, connection);
	try {
		await connection.initialize();
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

	connectionState.connected = true;
}

export async function migrate() {
	(connection.options.migrations as Migration[]).forEach(wrapMigration);
	await connection.runMigrations({ transaction: 'each' });
	connectionState.migrated = true;
}

export const close = async () => {
	if (pingTimer) {
		clearTimeout(pingTimer);
		pingTimer = undefined;
	}

	if (connection.isInitialized) await connection.destroy();
};
