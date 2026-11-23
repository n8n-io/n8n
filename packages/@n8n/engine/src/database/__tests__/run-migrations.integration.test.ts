import { randomUUID } from 'node:crypto';

import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDataSource } from '../data-source';
import { migrations } from '../migrations';
import { runMigrations } from '../run-migrations';

describe('runMigrations (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let admin: DataSource;
	const processes: DataSource[] = [];

	beforeAll(async () => {
		container = await new PostgreSqlContainer(postgresVersions.primary).start();
		admin = createDataSource(container.getConnectionUri());
		await admin.initialize();
	}, 120_000);

	afterAll(async () => {
		for (const dataSource of [...processes, admin]) {
			if (dataSource?.isInitialized) await dataSource.destroy();
		}
		if (container) await container.stop();
	});

	async function createEmptyDatabase(isolationLevel = 'read committed'): Promise<string> {
		const name = `engine_${randomUUID().replaceAll('-', '')}`;
		await admin.query(`CREATE DATABASE ${name}`);
		await admin.query(
			`ALTER DATABASE ${name} SET default_transaction_isolation = '${isolationLevel}'`,
		);
		const url = new URL(container.getConnectionUri());
		url.pathname = `/${name}`;
		return url.toString();
	}

	async function startProcess(url: string): Promise<DataSource> {
		const dataSource = createDataSource(url, { poolSize: 1 });
		await dataSource.initialize();
		processes.push(dataSource);
		return dataSource;
	}

	async function migrationNames(dataSource: DataSource): Promise<string[]> {
		const rows: Array<{ name: string }> = await dataSource.query(
			'SELECT name FROM migrations ORDER BY timestamp',
		);
		return rows.map((row) => row.name);
	}

	it.each(['read committed', 'repeatable read', 'serializable'])(
		'lets several processes with one connection each migrate one fresh database at the same time when the database defaults to %s',
		async (isolationLevel) => {
			const url = await createEmptyDatabase(isolationLevel);
			const started = await Promise.all([1, 2, 3, 4].map(async () => await startProcess(url)));

			const results = await Promise.allSettled(started.map(runMigrations));

			expect(results.filter((result) => result.status === 'rejected')).toEqual([]);
			expect(await migrationNames(started[0])).toEqual(
				migrations.map((migration) => migration.name),
			);
		},
	);

	it('releases the lock when a migration fails, so the next process can migrate', async () => {
		const url = await createEmptyDatabase();
		const [failing, next] = await Promise.all([startProcess(url), startProcess(url)]);
		await failing.query('CREATE TABLE workflow_seeded_step (id int)');

		await expect(runMigrations(failing)).rejects.toThrow('already exists');

		const advisoryLocks: unknown[] = await next.query(
			"SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND database = (SELECT oid FROM pg_database WHERE datname = current_database())",
		);
		expect(advisoryLocks).toEqual([]);

		await failing.query('DROP TABLE workflow_seeded_step');
		await runMigrations(next);

		expect(await migrationNames(next)).toEqual(migrations.map((migration) => migration.name));
	});
});
