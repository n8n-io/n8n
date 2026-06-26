import type { Logger } from '@n8n/backend-common';
import type { DatabaseConfig } from '@n8n/config';
import { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { ErrorReporter } from 'n8n-core';
import { getContainerRuntimeClient } from 'testcontainers';
import { mock } from 'vitest-mock-extended';

import type { DbConnectionMetrics } from '../db-connection-metrics';
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
 * Connection source, in priority order:
 *  1. The standard `DB_POSTGRESDB_*` environment variables, when set — the same
 *     convention the rest of the suite uses (see
 *     packages/cli/test/setup-testcontainers.js). This is how you run the suite
 *     locally: point them at any running Postgres.
 *  2. Otherwise a throwaway Postgres container, when a container runtime is
 *     available. This is what lets the suite run on CI, whose unit lane has no
 *     external database but does have a usable container runtime.
 *
 * When neither is available the suite is skipped, so `pnpm test` still passes on
 * a machine with no Postgres and no usable container runtime.
 *
 * To run it locally, boot a Postgres and export the host, e.g.:
 *   docker run --rm -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:18-alpine
 *   DB_POSTGRESDB_HOST=localhost DB_POSTGRESDB_PASSWORD=password \
 *     pnpm test db-connection-monitor.recovery.postgres
 */
const POSTGRES_IMAGE = 'postgres:18-alpine';
const CONTAINER_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 60_000;

// Prefer an externally-provided Postgres (local dev, cli-style integration lanes).
const externalHost = process.env.DB_POSTGRESDB_HOST ?? '';
const useExternalPostgres = externalHost.length > 0;

// The recovery trigger is private; expose it for the test without loosening prod typing.
type MonitorInternals = { recoverDataSource: () => Promise<void> };

type PgConnection = {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
};

const buildDatabaseConfig = () =>
	mock<DatabaseConfig>({
		pingTimeoutMs: 5_000,
		pingMaxFailuresBeforeRecovery: 3,
		minRecoveryBackoffMs: 1_000,
		maxRecoveryBackoffMs: 30_000,
		connectionAcquisitionTimeoutMs: 30_000,
	});

const newDataSource = (conn: PgConnection) =>
	new DataSource({
		type: 'postgres',
		host: conn.host,
		port: conn.port,
		username: conn.username,
		password: conn.password,
		database: conn.database,
		// No entities/migrations — the test only runs trivial SELECTs through the driver.
		synchronize: false,
	});

describe('DbConnectionMonitor recovery against real Postgres', () => {
	let container: StartedPostgreSqlContainer | undefined;
	// Left undefined when no Postgres is reachable; the tests skip themselves in
	// that case (see the `ctx.skip()` guards below).
	let connection: PgConnection | undefined;

	beforeAll(async () => {
		if (useExternalPostgres) {
			connection = {
				host: externalHost,
				port: Number(process.env.DB_POSTGRESDB_PORT ?? '5432'),
				username: process.env.DB_POSTGRESDB_USER ?? 'postgres',
				password: process.env.DB_POSTGRESDB_PASSWORD ?? 'postgres',
				database: process.env.DB_POSTGRESDB_DATABASE ?? 'postgres',
			};
			return;
		}

		// No external Postgres: fall back to a throwaway container, but only where a
		// runtime is usable. Probe via testcontainers' own detection rather than
		// `docker info` — the CLI can succeed while testcontainers fails to find a
		// working runtime strategy, which would make `start()` throw instead of
		// leaving the tests to skip.
		const runtimeAvailable = await getContainerRuntimeClient().then(
			() => true,
			() => false,
		);
		if (!runtimeAvailable) {
			return;
		}

		container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
		connection = {
			host: container.getHost(),
			port: container.getMappedPort(5432),
			username: container.getUsername(),
			password: container.getPassword(),
			database: container.getDatabase(),
		};
	}, CONTAINER_TIMEOUT_MS);

	afterAll(async () => {
		await container?.stop();
	}, CONTAINER_TIMEOUT_MS);

	it(
		'control: acquiring a connection after the pool is torn down rejects',
		async (ctx) => {
			if (!connection) {
				ctx.skip();
				return;
			}
			// Establishes that this environment reproduces the failure the wrapper guards
			// against: with no monitor/wrapper installed, acquiring a connection after the
			// pool is ended rejects with the exact error seen in production.
			const dataSource = newDataSource(connection);
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
		async (ctx) => {
			if (!connection) {
				ctx.skip();
				return;
			}
			const dataSource = newDataSource(connection);
			await dataSource.initialize();

			const monitor = new DbConnectionMonitor(
				dataSource,
				() => {},
				buildDatabaseConfig(),
				mock<Logger>(),
				mock<ErrorReporter>(),
				mock<DbConnectionMetrics>(),
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
				// pool-after-end error; with it, the call waits out recovery and retries against
				// the rebuilt pool.
				const rows = (
					await Promise.all([queryRunner.query('SELECT 42 AS answer'), recovery])
				)[0] as Array<{ answer: number }>;

				// The real proof of suspension is that the query produced its result at all:
				// without the wrapper it would have rejected with the pool-after-end error
				// ("Cannot use a pool after calling end on the pool") when it
				// hit the torn-down pool, failing the `Promise.all` above before we reached
				// this line. `recoveryDone` is necessarily true here (the `Promise.all` awaits
				// `recovery`); we assert it only to pin that recovery actually ran.
				expect(recoveryDone).toBe(true);
				expect(rows).toEqual([{ answer: 42 }]);

				await queryRunner.release();

				// The pool is healthy afterwards.
				expect(await dataSource.query('SELECT 1 AS ok')).toEqual([{ ok: 1 }]);
			} finally {
				await monitor.stop();
				if (dataSource.isInitialized) {
					await dataSource.destroy();
				}
			}
		},
		TEST_TIMEOUT_MS,
	);
});
