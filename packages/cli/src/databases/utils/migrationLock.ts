import { Connection } from 'typeorm';
import { DatabaseType } from '@/Interfaces';
import * as GenericHelpers from '@/GenericHelpers';
import { LoggerProxy } from 'n8n-workflow';

const RETRY_WAIT_MS = 3000;
const MAX_RETRIES = 40; // 2 minutes
let RETRY_COUNT = 0;

async function pgLock(connection: Connection, ignoreFail = false): Promise<boolean> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const [{ pg_try_advisory_lock: locked }]: [{ pg_try_advisory_lock: boolean }] =
		await connection.manager.query(`SELECT pg_try_advisory_lock(15670156)`);
	if (!locked) {
		if (RETRY_COUNT > MAX_RETRIES) {
			if (ignoreFail) {
				return false;
			} else {
				throw new Error(`Could not acquire migration lock after ${MAX_RETRIES} retries. Aborting.`);
			}
		}
		LoggerProxy.debug(`Waiting for migration to unlock...`);
		RETRY_COUNT++;
		await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));
		const result = await pgLock(connection);
		return result;
	} else {
		return locked;
	}
}

async function pgUnlock(connection: Connection): Promise<boolean> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const [{ pg_advisory_unlock: unlocked }]: [{ pg_advisory_unlock: boolean }] =
		await connection.manager.query(`SELECT pg_advisory_unlock(15670156)`);
	return unlocked;
}

// Note that MySQL does not support advisory locks like Postgres does.
// Instead we check with IS_USED_LOCK() to see if the lock is in use by _any_ connection.
async function mysqlLock(connection: Connection, ignoreFail = false): Promise<boolean> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const [{ [`IS_USED_LOCK('lockn8n')`]: isUsedLock }]: [{ [`IS_USED_LOCK('lockn8n')`]: boolean }] =
		await connection.manager.query(`SELECT IS_USED_LOCK('lockn8n')`);

	if (!!isUsedLock) {
		if (RETRY_COUNT > MAX_RETRIES) {
			if (ignoreFail) {
				return false;
			} else {
				throw new Error(`Could not acquire migration lock after ${MAX_RETRIES} retries. Aborting.`);
			}
		}
		LoggerProxy.debug(`Waiting for migration to unlock...`);
		RETRY_COUNT++;
		await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));
		const result = await mysqlLock(connection);
		return result;
	} else {
		let locked = false;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const [{ [`IS_FREE_LOCK('lockn8n')`]: isFreeLock }]: [
			{ [`IS_FREE_LOCK('lockn8n')`]: boolean },
		] = await connection.manager.query(`SELECT IS_FREE_LOCK('lockn8n')`);
		if (!!isFreeLock) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const [{ [`GET_LOCK('lockn8n',1)`]: lockResult }]: [{ [`GET_LOCK('lockn8n',1)`]: boolean }] =
				await connection.manager.query(`SELECT GET_LOCK('lockn8n',1)`);
			locked = !!lockResult;
			return locked;
		}
	}
	return false;
}

async function mysqlUnlock(connection: Connection): Promise<boolean> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const [{ [`RELEASE_LOCK('lockn8n')`]: unlocked }]: [{ [`RELEASE_LOCK('lockn8n')`]: boolean }] =
		await connection.manager.query(`SELECT RELEASE_LOCK('lockn8n')`);
	return !!unlocked;
}

async function withMigrationLock(
	connection: Connection,
	fn: () => Promise<void>,
): Promise<boolean> {
	let lock = false;
	const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;
	const ignoreFail = (await GenericHelpers.getConfigValue(
		'database.ignoreMigrationLockFail',
	)) as boolean;
	try {
		// try to acquire a lock
		switch (dbType) {
			case 'postgresdb':
				lock = await pgLock(connection, ignoreFail);
				break;
			case 'mariadb':
			case 'mysqldb':
				lock = await mysqlLock(connection, ignoreFail);
				break;
			case 'sqlite':
				lock = true;
				break;
			default:
				lock = false;
		}

		if (!lock) {
			LoggerProxy.debug(`Failed to get migration lock. Aborting.`);
			return false;
		}

		LoggerProxy.debug(`Migration lock set. Continuing migration.`);

		await fn();

		return true;
	} finally {
		let unlocked = false;
		if (lock) {
			switch (dbType) {
				case 'postgresdb':
					unlocked = await pgUnlock(connection);
					break;
				case 'mariadb':
				case 'mysqldb':
					unlocked = await mysqlUnlock(connection);
					break;
				case 'sqlite':
				default:
					unlocked = true;
			}

			if (!unlocked) {
				LoggerProxy.warn(`Migration was not locked.`);
			}

			LoggerProxy.debug(`Migration lock released.`);
		}
	}
}

/**
 * Runs migrations with a lock to prevent multiple instances from running migrations at the same time.
 * If the lock cannot be acquired, the migration will fail and startup will stop, unless the
 * `database.ignoreMigrationLockFail` / DB_IGNORE_MIGRATION_LOCK_FAIL config option is set to true.
 * @param connection
 * @param closeAfterMigration
 */
export async function migrateDatabaseWithLock(
	connection: Connection,
	closeAfterMigration: boolean,
) {
	await withMigrationLock(connection, async () => {
		await connection.runMigrations({
			transaction: 'all',
		});
	});
	if (closeAfterMigration) {
		await connection.close();
	}
}
