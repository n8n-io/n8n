import { DataSource } from '../../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { UserEntitySchema } from './entity/User';
import { expect } from 'chai';

describe('entity-schema > embedded - class-instance', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [UserEntitySchema],
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));

	after(() => closeTestingConnections(connections));

	it('should create an table', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('user');
				await queryRunner.release();

				expect(table).exist;
			}),
		));

	it('should not create table with embedded', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('name');
				await queryRunner.release();

				expect(table).not.exist;
			}),
		));

	it('should create embedded column name with prefix', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('user');
				await queryRunner.release();

				expect(table!.findColumnByName('name_First')).exist;
				expect(table!.findColumnByName('name_Last')).exist;
			}),
		));

	it('should create index for embedded', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('user');
				await queryRunner.release();

				expect(table!.indices.length).to.be.equal(1);
				expect(table!.indices[0].columnNames).to.deep.include.members(['name_First']);
			}),
		));
});
