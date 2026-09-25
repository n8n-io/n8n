import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { LockAcquireTimeoutError } from '../../../src/error/LockAcquireTimeoutError';

describe('sqlite driver > write connection acquire timeout', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite-pooled'],
				driverSpecific: {
					enableWAL: true,
					acquireTimeout: 1,
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should timeout if acquire with trx takes too long', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				const qr1 = connection.createQueryRunner();
				const qr2 = connection.createQueryRunner();

				let trx2Threw = null;
				await qr1.startTransaction(); // Acquire lock on the connection
				const trx2Promise = qr2.startTransaction().catch((e) => {
					trx2Threw = e;
				});

				// Wait for the acquire to timeout
				await new Promise((resolve) => setTimeout(resolve, 1));

				await trx2Promise;
				expect(trx2Threw).to.be.instanceOf(LockAcquireTimeoutError);
				expect(qr2.isTransactionActive).to.be.false;

				await qr1.query('SELECT 1');
				await qr1.commitTransaction();

				// Acquiring a lock should now be possible
				await qr2.startTransaction();
				await qr2.query('SELECT 1');
				await qr2.commitTransaction();
			}),
		);
	});

	it('should timeout if acquire without trx takes too long', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				const qr1 = connection.createQueryRunner();
				const qr2 = connection.createQueryRunner();

				let op2Threw = null;
				await qr1.startTransaction(); // Acquire lock on the connection
				const op2Promise = qr2
					.query('INSERT INTO post (title) VALUES ($1)', ['new post'])
					.catch((e) => {
						op2Threw = e;
					});

				// Wait for the acquire to timeout
				await new Promise((resolve) => setTimeout(resolve, 1));

				await op2Promise;
				expect(op2Threw).to.be.instanceOf(LockAcquireTimeoutError);

				await qr1.query('SELECT 1');
				await qr1.commitTransaction();

				// Acquiring a lock should now be possible
				await qr2.startTransaction();
				await qr2.query('INSERT INTO post (title) VALUES ($1)', ['new post']);
				await qr2.commitTransaction();
			}),
		);
	});
});
