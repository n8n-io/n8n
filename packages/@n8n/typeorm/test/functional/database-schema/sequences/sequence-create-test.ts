import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { expect } from 'chai';

import { Person } from './entity/Person';

describe('sequences > creating a sequence and marking the column as generated', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Person],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	describe('create table and check that primary key column is marked as generated', function () {
		it('should check that the primary key column is generated automatically', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const table = await queryRunner.getTable('person');
					await queryRunner.release();

					expect(table!.findColumnByName('Id')!.isGenerated).to.be.true;
				}),
			));
	});
});
