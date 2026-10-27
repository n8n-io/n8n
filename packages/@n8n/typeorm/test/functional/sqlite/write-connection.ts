import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('sqlite driver > write connection', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite-pooled'],
				driverSpecific: {
					enableWAL: true,
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should block the second query runner until the first one releases the write connection', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				const qr1 = connection.createQueryRunner();
				const qr2 = connection.createQueryRunner();

				let trx2Started = null;
				await qr1.startTransaction(); // Acquire lock on the connection
				const trx2Promise = qr2.startTransaction().then(() => {
					trx2Started = Date.now();
				});

				await new Promise((resolve) => setTimeout(resolve, 100));

				expect(trx2Started).to.be.null;
				await qr1.rollbackTransaction();

				await trx2Promise;
				expect(trx2Started).to.be.not.null;
				await qr2.rollbackTransaction();
			}),
		);
	});

	it('should allow reading even if write lock has been acquired', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				const qr1 = connection.createQueryRunner();
				const qr2 = connection.createQueryRunner();

				await qr1.startTransaction(); // Acquire lock on the connection

				await qr2.query('SELECT * FROM post');
				await qr1.query('SELECT 1');

				await qr1.rollbackTransaction();
			}),
		);
	});
});
