import 'reflect-metadata';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Example } from './entity/Example';
import { expect } from 'chai';

describe('github issues > #7867 Column not renamed when schema/database is set', () => {
	describe('schema is set', () => {
		let connections: DataSource[];
		before(async () => {
			connections = await createTestingConnections({
				entities: [Example],
				schemaCreate: true,
				dropSchema: true,
				driverSpecific: {
					schema: 'public',
				},
				enabledDrivers: ['postgres'],
			});
		});
		beforeEach(() => reloadTestingDatabases(connections));
		after(() => closeTestingConnections(connections));

		it('should correctly change column name', () =>
			Promise.all(
				connections.map(async (connection) => {
					const postMetadata = connection.getMetadata(Example);
					const nameColumn = postMetadata.findColumnWithPropertyName('name')!;
					nameColumn.propertyName = 'title';
					nameColumn.build(connection);

					await connection.synchronize();

					const queryRunner = connection.createQueryRunner();
					const postTable = await queryRunner.getTable('example');
					await queryRunner.release();

					expect(postTable!.findColumnByName('name')).to.be.undefined;
					postTable!.findColumnByName('title')!.should.be.exist;

					// revert changes
					nameColumn.propertyName = 'name';
					nameColumn.build(connection);
				}),
			));
	});
});
