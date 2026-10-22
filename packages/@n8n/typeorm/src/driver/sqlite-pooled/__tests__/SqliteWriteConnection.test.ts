import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LockAcquireTimeoutError } from '../../../error/LockAcquireTimeoutError';
import { SqliteLibrary } from '../SqliteLibrary';
import type { DbLease, DbLeaseHolder } from '../SqlitePooledTypes';
import { SqliteWriteConnection } from '../SqliteWriteConnection';

const ACQUIRE_TIMEOUT_MS = 100;
const OPEN_ERROR = new Error('SQLITE_CANTOPEN: unable to open database file');
const SELECT_ONE_ROWS = [{ one: 1 }];
const LEASE_HOLDER: DbLeaseHolder = { requestRelease: () => {} };

describe('SqliteWriteConnection', () => {
	let databaseDir: string;
	let library: SqliteLibrary;
	let writeConnection: SqliteWriteConnection;

	const selectOne = async (lease: DbLease) =>
		await library.runQuery(lease.connection, 'SELECT 1 AS one');

	const failNextOpen = () =>
		vi.spyOn(library, 'createDatabaseConnection').mockRejectedValueOnce(OPEN_ERROR);

	const invalidateWriteConnection = async () => {
		const lease = await writeConnection.leaseConnection(LEASE_HOLDER);
		lease.markAsInvalid();
		await lease.release();
	};

	beforeEach(async () => {
		databaseDir = mkdtempSync(join(tmpdir(), 'sqlite-write-connection-'));
		library = new SqliteLibrary({
			type: 'sqlite-pooled',
			database: join(databaseDir, 'database.sqlite'),
			enableWAL: true,
			acquireTimeout: ACQUIRE_TIMEOUT_MS,
			destroyTimeout: ACQUIRE_TIMEOUT_MS,
		});
		library.loadLibrary();
		writeConnection = new SqliteWriteConnection(library, {
			acquireTimeout: ACQUIRE_TIMEOUT_MS,
			destroyTimeout: ACQUIRE_TIMEOUT_MS,
		});
		await writeConnection.connect();
	});

	afterEach(async () => {
		await writeConnection.close().catch(() => {});
		rmSync(databaseDir, { recursive: true, force: true });
	});

	it('rejects the lease with the open error when the reopen fails', async () => {
		await invalidateWriteConnection();
		failNextOpen();

		await expect(writeConnection.leaseConnection(LEASE_HOLDER)).rejects.toBe(OPEN_ERROR);
	});

	it('reuses the open connection across valid leases', async () => {
		const first = await writeConnection.leaseConnection(LEASE_HOLDER);
		const firstConnection = first.connection;
		await first.release();

		const second = await writeConnection.leaseConnection(LEASE_HOLDER);

		expect(second.connection).toBe(firstConnection);
		await second.release();
	});

	it('opens a new connection after an invalid lease is released', async () => {
		const first = await writeConnection.leaseConnection(LEASE_HOLDER);
		const firstConnection = first.connection;
		first.markAsInvalid();
		await first.release();

		const second = await writeConnection.leaseConnection(LEASE_HOLDER);

		expect(second.connection).not.toBe(firstConnection);
		expect(await selectOne(second)).toEqual(SELECT_ONE_ROWS);
		await second.release();
	});

	it('keeps the lock of the active lease when another lease times out', async () => {
		const active = await writeConnection.leaseConnection(LEASE_HOLDER);

		await expect(writeConnection.leaseConnection(LEASE_HOLDER)).rejects.toBeInstanceOf(
			LockAcquireTimeoutError,
		);
		await expect(writeConnection.leaseConnection(LEASE_HOLDER)).rejects.toBeInstanceOf(
			LockAcquireTimeoutError,
		);
		await active.release();
	});

	it('gives the next lease a working connection after the reopen fails', async () => {
		await invalidateWriteConnection();
		failNextOpen();
		await writeConnection.leaseConnection(LEASE_HOLDER).catch(() => {});

		const next = await writeConnection.leaseConnection(LEASE_HOLDER);

		expect(await selectOne(next)).toEqual(SELECT_ONE_ROWS);
		await next.release();
	});

	it('gives the next runExclusive a working connection after the reopen fails', async () => {
		await writeConnection.runExclusive(LEASE_HOLDER, async (lease) => lease.markAsInvalid());
		failNextOpen();
		await writeConnection.runExclusive(LEASE_HOLDER, selectOne).catch(() => {});

		expect(await writeConnection.runExclusive(LEASE_HOLDER, selectOne)).toEqual(SELECT_ONE_ROWS);
	});
});
