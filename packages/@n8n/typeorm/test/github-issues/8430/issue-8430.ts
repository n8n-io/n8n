import 'reflect-metadata';
import { DataSource } from '../../../src';
import {
	reloadTestingDatabases,
	createTestingConnections,
	closeTestingConnections,
} from '../../utils/test-utils';
import { expect } from 'chai';

describe('github issues > #8430 sqlite temporary tables do not honor withoutRowid', () => {
	let connections: DataSource[] = [];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	it("should keep 'withoutRowid' after table recreation", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');

				expect(table!.withoutRowid).to.be.true;

				let nameColumn = table!.findColumnByName('name')!;
				const changedColumn = nameColumn.clone();
				changedColumn.name = 'changedName';

				await queryRunner.changeColumn(table!, nameColumn, changedColumn);

				const changedTable = await queryRunner.getTable('post');
				await queryRunner.release();

				expect(changedTable!.withoutRowid).to.be.true;
			}),
		));
});
