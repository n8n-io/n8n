import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { LockAcquireTimeoutError } from '../../../src/error/LockAcquireTimeoutError';
import { QueryRunner } from '../../../src/query-runner/QueryRunner';

describe('sqlite driver > readonly pool acquire timeout', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite-pooled'],
				driverSpecific: {
					enableWAL: true,
					acquireTimeout: 50,
					poolSize: 2,
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// Same fallback as `SqliteReadWriteDriver`, in case ormconfig overrides `driverSpecific`.
	const poolSizeOf = (connection: DataSource) =>
		(connection.options as { poolSize?: number }).poolSize ?? 4;

	const leaseWholeReadPool = async (connection: DataSource): Promise<QueryRunner[]> => {
		const holders: QueryRunner[] = [];
		for (let i = 0; i < poolSizeOf(connection); i++) {
			const qr = connection.createQueryRunner('slave');
			await qr.startTransaction();
			holders.push(qr);
		}
		return holders;
	};

	const releaseAll = async (holders: QueryRunner[]) => {
		for (const qr of holders) {
			await qr.commitTransaction();
			await qr.release();
		}
	};

	it('should name the read pool when a slave transaction times out', () =>
		Promise.all(
			connections.map(async (connection) => {
				const holders = await leaseWholeReadPool(connection);
				const waiting = connection.createQueryRunner('slave');

				let error: unknown;
				await waiting.startTransaction().catch((e) => (error = e));

				expect(error).to.be.instanceOf(LockAcquireTimeoutError);
				const size = poolSizeOf(connection);
				expect((error as Error).message).to.equal(
					`Timeout waiting for lock SqliteReadonlyConnectionPool (${size}/${size} leased) to become available`,
				);
				expect(waiting.isTransactionActive).to.be.false;

				await releaseAll(holders);

				// The pool is usable again once the holders release.
				await waiting.startTransaction();
				await waiting.query('SELECT 1');
				await waiting.commitTransaction();
				await waiting.release();
			}),
		));

	it('should name the read pool when a plain read times out', () =>
		Promise.all(
			connections.map(async (connection) => {
				const holders = await leaseWholeReadPool(connection);
				const reader = connection.createQueryRunner();

				let error: unknown;
				await reader.query('SELECT 1').catch((e) => (error = e));

				expect(error).to.be.instanceOf(LockAcquireTimeoutError);
				expect((error as Error).message).to.contain('SqliteReadonlyConnectionPool');

				await releaseAll(holders);
				await reader.query('SELECT 1');
				await reader.release();
			}),
		));
});
