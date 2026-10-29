import 'reflect-metadata';
import { expect } from 'chai';
import sinon from 'sinon';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { SqliteReadWriteQueryRunner } from '../../../../src/driver/sqlite-pooled/SqliteReadWriteQueryRunner';

describe('transaction > transaction with sqlite-pooled', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should use BEGIN IMMEDIATE to start a trx', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner() as SqliteReadWriteQueryRunner;

				const queryFn = sinon.spy(queryRunner, 'runQueryWithinConnection');
				await queryRunner.startTransaction();

				expect(queryFn.called).to.be.true;
				expect(queryFn.firstCall.args[1]).to.be.eql('BEGIN IMMEDIATE TRANSACTION');

				await queryRunner.commitTransaction();
				await queryRunner.release();
			}),
		));

	it('should use a deferred BEGIN on a slave (read-only) runner', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner('slave') as SqliteReadWriteQueryRunner;

				const queryFn = sinon.spy(queryRunner, 'runQueryWithinConnection');
				await queryRunner.startTransaction();

				expect(queryFn.firstCall.args[1]).to.be.eql('BEGIN TRANSACTION');

				await queryRunner.commitTransaction();
				await queryRunner.release();
			}),
		));

	it('should not wait for an open write transaction when reading on a slave runner', () =>
		Promise.all(
			connections.map(async (connection) => {
				const writer = connection.createQueryRunner() as SqliteReadWriteQueryRunner;
				const reader = connection.createQueryRunner('slave') as SqliteReadWriteQueryRunner;

				await writer.startTransaction();
				try {
					await reader.startTransaction();
					const rows = await reader.query('SELECT 1 AS value');
					expect(rows).to.be.eql([{ value: 1 }]);
					await reader.commitTransaction();
				} finally {
					await reader.release();
					await writer.rollbackTransaction();
					await writer.release();
				}
			}),
		));

	it('should release an open slave transaction when the read pool closes', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner('slave') as SqliteReadWriteQueryRunner;
				await queryRunner.startTransaction();

				const requestRelease = sinon.spy(queryRunner, 'requestRelease');
				await connection.destroy();
				try {
					expect(requestRelease.calledOnce).to.be.true;
					expect(queryRunner.isTransactionActive).to.be.false;
				} finally {
					await connection.initialize();
				}
			}),
		));

	it('should reject a write inside a slave (read-only) transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner('slave') as SqliteReadWriteQueryRunner;

				await queryRunner.startTransaction();
				try {
					let error: unknown;
					try {
						await queryRunner.query('CREATE TABLE read_only_probe (id INTEGER)');
					} catch (e) {
						error = e;
					}
					expect(error).to.be.instanceOf(Error);
					expect(String((error as Error).message)).to.match(/readonly/i);
				} finally {
					await queryRunner.rollbackTransaction();
					await queryRunner.release();
				}
			}),
		));
});
