/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Container } from 'typedi';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource as Connection } from '@n8n/typeorm';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';

import config from '@/config';
import { inTest } from '@/constants';
import { wrapMigration } from '@db/utils/migrationHelpers';
import type { Migration } from '@db/types';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { ExecutionDataRepository } from '@db/repositories/executionData.repository';
import { ExecutionMetadataRepository } from '@db/repositories/executionMetadata.repository';
import { getConnectionOptions } from '@db/config';

let mainConnection: Connection;
let executionConnection: Connection;

export const getConnection = () => mainConnection!;

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
		if (mainConnection?.isInitialized) {
			try {
				await mainConnection.query('SELECT 1');
				connectionState.connected = true;
				return;
			} catch (error) {
				ErrorReporter.error(error);
			} finally {
				pingTimer = setTimeout(pingDBFn, 2000);
			}
		}
		connectionState.connected = false;
	};
	pingTimer = setTimeout(pingDBFn, 2000);
}

export async function transaction<T>(fn: (entityManager: EntityManager) => Promise<T>): Promise<T> {
	return await mainConnection.transaction(fn);
}

export async function setSchema(conn: Connection) {
	const schema = config.getEnv('database.postgresdb.schema');
	const searchPath = ['public'];
	if (schema !== 'public') {
		await conn.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
		searchPath.unshift(schema);
	}
	await conn.query(`SET search_path TO ${searchPath.join(',')};`);
}

export async function init(): Promise<void> {
	if (connectionState.connected) return;

	const dbType = config.getEnv('database.type');
	const connectionOptions = getConnectionOptions();

	mainConnection = new Connection(connectionOptions);
	Container.set(Connection, mainConnection);
	await mainConnection.initialize();

	if (dbType === 'postgresdb') {
		await setSchema(mainConnection);
	}

	if (dbType === 'sqlite') {
		executionConnection = new Connection(connectionOptions);
		await executionConnection.initialize();
		const { manager } = executionConnection;
		Object.assign(Container.get(ExecutionRepository), { manager });
		Object.assign(Container.get(ExecutionDataRepository), { manager });
		Object.assign(Container.get(ExecutionMetadataRepository), { manager });
	}

	connectionState.connected = true;
}

export async function migrate() {
	(mainConnection.options.migrations as Migration[]).forEach(wrapMigration);
	await mainConnection.runMigrations({ transaction: 'each' });
	connectionState.migrated = true;
}

export const close = async () => {
	if (pingTimer) {
		clearTimeout(pingTimer);
		pingTimer = undefined;
	}

	if (mainConnection.isInitialized) await mainConnection.destroy();
	if (executionConnection?.isInitialized) await executionConnection.destroy();
};
