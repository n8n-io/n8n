import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { ErrorReporter } from 'n8n-core';
import { execSync } from 'node:child_process';
import { mock } from 'vitest-mock-extended';

import { DbConnectionMonitor } from '../db-connection-monitor';

/**
 * Integration coverage for the connection-acquisition suspension (CAT-3455).
 *
 * Unlike the unit suite (which mocks the DataSource), this exercises a REAL
 * Postgres pool through a REAL recovery (`destroy()` + `initialize()`) and proves
 * that a real TypeORM query issued mid-recovery is held and then completes against
 * the rebuilt pool, instead of throwing `Cannot use a pool after calling end on
 * the pool` / `Driver not Connected`.
 *
 * The acquisition wrapper only exists for Postgres: it hooks `driver.obtainMasterConnection`,
 * which is the genuine connection chokepoint for the Postgres driver.
 * The sqlite driver's `obtainMasterConnection` is a no-op,
 * so there is nothing to suspend there and no in-process substitute for this test.
 *
 * Skipped automatically when Docker is unavailable so `pnpm test` still passes on machines without a daemon.
 */
const POSTGRES_IMAGE = 'postgres:18-alpine';
const CONTAINER_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 60_000;

const dockerAvailable = (() => {
	try {
		execSync('docker info', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
})();

// The recovery trigger is private; expose it for the test without loosening prod typing.
type MonitorInternals = { recoverDataSource: () => Promise<void> };

const buildDatabaseConfig = () =>
	mock<DatabaseConfig>({
		pingTimeoutMs: 5_000,
		pingMaxFailuresBeforeRecovery: 3,
		minRecoveryBackoffMs: 1_000,
		maxRecoveryBackoffMs: 30_000,
	});

const newDataSource = (uri: string) =>
	new DataSource({
		type: 'postgres',
		url: uri,
		// No entities/migrations — the test only runs trivial SELECTs through the driver.
		synchronize: false,
	});

describe.skipIf(!dockerAvailable)('DbConnectionMonitor recovery against real Postgres', () => {
	let container: StartedPostgreSqlContainer;
	let connectionUri: string;

	beforeAll(async () => {
		container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
		connectionUri = container.getConnectionUri();
	}, CONTAINER_TIMEOUT_MS);

	afterAll(async () => {
		await container?.stop();
	}, CONTAINER_TIMEOUT_MS);

	it(
		'control: the real driver throws the CAT-3455 error once its pool is torn down',
		async () => {
			// Establishes that this environment reproduces the failure the wrapper guards
			// against: with no monitor/wrapper installed, acquiring a connection after the
			// pool is ended rejects with the exact error seen in production.
			const dataSource = newDataSource(connectionUri);
			await dataSource.initialize();

			const driver = dataSource.driver as unknown as MonitorInternals &
				Record<'obtainMasterConnection', () => Promise<unknown>>;

			await dataSource.destroy();

			await expect(driver.obtainMasterConnection()).rejects.toThrow(
				/Cannot use a pool after calling end on the pool|Driver not Connected/,
			);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		'suspends a real query during recovery and runs it on the rebuilt pool',
		async () => {
			const dataSource = newDataSource(connectionUri);
			await dataSource.initialize();

			const monitor = new DbConnectionMonitor(
				dataSource,
				() => {},
				buildDatabaseConfig(),
				mock<Logger>(),
				mock<ErrorReporter>(),
			);
			// start() installs the obtainMasterConnection wrapper on the live driver.
			// Under vitest (NODE_ENV=test) it does not schedule background pings, so the
			// only recovery is the one we trigger explicitly below.
			monitor.start();

			try {
				// Sanity: queries work before any recovery.
				expect(await dataSource.query('SELECT 1 AS ok')).toEqual([{ ok: 1 }]);

				// A query runner bound to the *current* (soon-to-be-destroyed) driver.
				const queryRunner = dataSource.createQueryRunner();

				// Kick off a real recovery (destroy + reinitialize the live pool). The
				// pending-recovery promise is set synchronously, before recovery's first
				// await, so the query below is guaranteed to land inside the window.
				let recoveryDone = false;
				const recovery = (monitor as unknown as MonitorInternals).recoverDataSource().then(() => {
					recoveryDone = true;
				});

				// PostgresQueryRunner.query -> connect() -> driver.obtainMasterConnection,
				// i.e. the exact chokepoint. Without suspension this rejects with the
				// CAT-3455 error; with it, the call waits out recovery and retries against
				// the rebuilt pool.
				const rows = (
					await Promise.all([queryRunner.query('SELECT 42 AS answer'), recovery])
				)[0] as Array<{ answer: number }>;

				// The query resolved only after recovery completed.
				// Proof it was suspended.
				expect(recoveryDone).toBe(true);
				expect(rows).toEqual([{ answer: 42 }]);

				await queryRunner.release();

				// The pool is healthy afterwards.
				expect(await dataSource.query('SELECT 1 AS ok')).toEqual([{ ok: 1 }]);
			} finally {
				monitor.stop();
				if (dataSource.isInitialized) {
					await dataSource.destroy();
				}
			}
		},
		TEST_TIMEOUT_MS,
	);
});
