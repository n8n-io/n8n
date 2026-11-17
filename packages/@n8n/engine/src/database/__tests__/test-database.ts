import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createDataSource } from '../index';
import { toSqliteDatetime } from '../sqlite/sqlite-values';

export type TestDialect = 'postgres' | 'sqlite';

/** `ENGINE_TEST_DB=sqlite` runs the integration suites on a temporary SQLite file. */
export const testDialect: TestDialect =
	process.env.ENGINE_TEST_DB === 'sqlite' ? 'sqlite' : 'postgres';

export interface TestDatabase {
	dataSource: DataSource;
	dialect: TestDialect;
	stop: () => Promise<void>;
}

/** A migrated engine database of the dialect under test, and how to drop it. */
export async function startTestDatabase(): Promise<TestDatabase> {
	let container: StartedPostgreSqlContainer | undefined;
	let dir: string | undefined;
	let url: string;
	if (testDialect === 'sqlite') {
		dir = mkdtempSync(join(tmpdir(), 'engine-sqlite-'));
		url = `sqlite://${join(dir, 'engine.sqlite')}`;
	} else {
		container = await new PostgreSqlContainer(postgresVersions.primary).start();
		url = container.getConnectionUri();
	}
	const dataSource = createDataSource(url);
	await dataSource.initialize();
	await dataSource.runMigrations();
	return {
		dataSource,
		dialect: testDialect,
		stop: async () => {
			if (dataSource.isInitialized) await dataSource.destroy();
			if (container) await container.stop();
			if (dir) rmSync(dir, { recursive: true, force: true });
		},
	};
}

/** Runs SQL written with Postgres `$n` placeholders on either dialect. */
export async function rawQuery<T = unknown>(
	dataSource: DataSource,
	sql: string,
	parameters: unknown[] = [],
): Promise<T> {
	const text = testDialect === 'sqlite' ? sql.replace(/\$\d+/g, '?') : sql;
	return (await dataSource.query(text, parameters)) as T;
}

/** A timestamp parameter in the form the dialect stores and compares. */
export function dbTimestamp(iso: string): string {
	return testDialect === 'sqlite' ? toSqliteDatetime(iso) : iso;
}
