import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';

describe('github issues > #3142 Unique constraint not created on embedded entity field', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				subscribers: [__dirname + '/subscriber/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should create unique constraint on embedded entity', () =>
		Promise.all(
			connections.map(async function (connection) {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('person');
				await queryRunner.release();

				expect(table!.uniques.length).to.be.equal(2);
				const contactUnique = table!.uniques.find(
					(unique) => unique.columnNames.indexOf('email') !== 0,
				);
				expect(contactUnique).to.be.exist;
			}),
		));
});
