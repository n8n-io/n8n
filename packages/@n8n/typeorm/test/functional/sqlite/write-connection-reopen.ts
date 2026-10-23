import 'reflect-metadata';
import { expect } from 'chai';
import sinon from 'sinon';
import { DataSource } from '../../../src/data-source/DataSource';
import { SqliteLibrary } from '../../../src/driver/sqlite-pooled/SqliteLibrary';
import { SqliteReadWriteQueryRunner } from '../../../src/driver/sqlite-pooled/SqliteReadWriteQueryRunner';
import { LockAcquireTimeoutError } from '../../../src/error/LockAcquireTimeoutError';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

const COMMIT_ERROR = new Error('SQLITE_IOERR: disk I/O error');
const OPEN_ERROR = new Error('SQLITE_CANTOPEN: unable to open database file');

describe('sqlite driver > write connection reopen', () => {
	let connections: DataSource[];

	// Each test breaks the write connection, so each test gets its own data source.
	beforeEach(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['sqlite-pooled'],
			driverSpecific: {
				enableWAL: true,
				acquireTimeout: 100,
				destroyTimeout: 100,
			},
		});
		await reloadTestingDatabases(connections);
	});
	afterEach(async () => {
		sinon.restore();
		await closeTestingConnections(connections).catch(() => {});
	});

	const failCommit = async (connection: DataSource) => {
		const queryRunner = connection.createQueryRunner() as SqliteReadWriteQueryRunner;
		await queryRunner.startTransaction();
		const runQuery = sinon.stub(queryRunner, 'runQueryWithinConnection').callThrough();
		runQuery.withArgs(sinon.match.any, 'COMMIT').rejects(COMMIT_ERROR);
		await queryRunner.commitTransaction().catch(() => {});
		await queryRunner.release();
	};

	const failNextWriteOpen = () => {
		const open = SqliteLibrary.prototype.createDatabaseConnection;
		let failed = false;
		sinon.stub(SqliteLibrary.prototype, 'createDatabaseConnection').callsFake(async function (
			this: SqliteLibrary,
			flags?: number,
		) {
			// Only the write connection opens without flags.
			if (flags === undefined && !failed) {
				failed = true;
				throw OPEN_ERROR;
			}
			return await open.call(this, flags);
		});
	};

	const countWriteOpens = (open: sinon.SinonSpy) =>
		open.getCalls().filter((call) => call.args[0] === undefined).length;

	const insertInTransaction = async (connection: DataSource, title: string) => {
		const queryRunner = connection.createQueryRunner();
		await queryRunner.startTransaction();
		await queryRunner.query('INSERT INTO post (title) VALUES ($1)', [title]);
		await queryRunner.commitTransaction();
		await queryRunner.release();
	};

	it('should reject the transaction with the open error if the write connection cannot be reopened', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				await failCommit(connection);
				failNextWriteOpen();

				const queryRunner = connection.createQueryRunner();
				await expect(queryRunner.startTransaction()).to.be.rejectedWith(OPEN_ERROR);
				await queryRunner.release();
			}),
		);
	});

	it('should reuse the write connection across transactions', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				const open = sinon.spy(SqliteLibrary.prototype, 'createDatabaseConnection');

				await insertInTransaction(connection, 'first');
				await insertInTransaction(connection, 'second');

				expect(countWriteOpens(open)).to.equal(0);
			}),
		);
	});

	it('should open one new write connection after a failed commit', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				await failCommit(connection);
				const open = sinon.spy(SqliteLibrary.prototype, 'createDatabaseConnection');

				await insertInTransaction(connection, 'after commit failure');

				expect(countWriteOpens(open)).to.equal(1);
			}),
		);
	});

	it('should keep the lock of the active transaction when another acquire times out', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				const active = connection.createQueryRunner();
				const second = connection.createQueryRunner();
				const third = connection.createQueryRunner();
				await active.startTransaction();

				await second.startTransaction().catch(() => {});

				await expect(third.startTransaction()).to.be.rejectedWith(LockAcquireTimeoutError);
				await active.commitTransaction();
				await Promise.all([active.release(), second.release(), third.release()]);
			}),
		);
	});

	it('should start the next transaction after the write connection failed to reopen', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				await failCommit(connection);
				failNextWriteOpen();
				const failed = connection.createQueryRunner();
				await failed.startTransaction().catch(() => {});
				await failed.release();

				await insertInTransaction(connection, 'after reopen');

				expect(await connection.query('SELECT title FROM post')).to.eql([
					{ title: 'after reopen' },
				]);
			}),
		);
	});

	it('should run the next write query after the write connection failed to reopen', async () => {
		return await Promise.all(
			connections.map(async (connection) => {
				await failCommit(connection);
				failNextWriteOpen();
				await connection.query('INSERT INTO post (title) VALUES ($1)', ['lost']).catch(() => {});

				await connection.query('INSERT INTO post (title) VALUES ($1)', ['after reopen']);

				expect(await connection.query('SELECT title FROM post')).to.eql([
					{ title: 'after reopen' },
				]);
			}),
		);
	});
});
