import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Connection } from '../../../src/connection/Connection';
import { expect } from 'chai';
import { TestEntity } from './entity/TestEntity';

describe('github issues > #8527 cannot clear database inside a transaction.', () => {
	let connections: Connection[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [TestEntity],
				enabledDrivers: ['postgres', 'sqlite', 'sqlite-pooled'],
				dropSchema: true,
				schemaCreate: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not fail when clearing a database inside a transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				await queryRunner.startTransaction();
				await expect(queryRunner.clearDatabase()).not.to.be.rejected;
				await queryRunner.commitTransaction();
				await queryRunner.release();
			}),
		));
});
