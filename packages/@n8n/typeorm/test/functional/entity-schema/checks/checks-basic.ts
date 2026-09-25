import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { PersonSchema } from './entity/Person';

describe('entity-schema > checks', () => {
	describe('entity-schema > checks > postgresmssql', () => {
		let connections: DataSource[];
		before(
			async () =>
				(connections = await createTestingConnections({
					entities: [<any>PersonSchema],
					enabledDrivers: ['postgres'],
				})),
		);
		beforeEach(() => reloadTestingDatabases(connections));
		after(() => closeTestingConnections(connections));

		it('should create a check constraints', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const table = await queryRunner.getTable('person');
					await queryRunner.release();

					table!.checks.length.should.be.equal(2);
				}),
			));
	});
});
