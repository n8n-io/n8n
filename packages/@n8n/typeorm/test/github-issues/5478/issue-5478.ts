import 'reflect-metadata';
import { DataSource } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { expect } from 'chai';
import { UserEntity } from './entity/UserEntity';

describe("github issues > #5478 Setting enumName doesn't change how migrations get generated", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				migrations: [],
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
				entities: [UserEntity],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should correctly rename enum', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				// add `enumName`
				let table = await queryRunner.getTable('user');
				const column = table!.findColumnByName('userType')!;
				const newColumn = column.clone();
				newColumn.enumName = 'UserTypeEnum';

				// change column
				await queryRunner.changeColumn(table!, column, newColumn);

				// check if `enumName` changed
				table = await queryRunner.getTable('user');
				let changedColumn = table!.findColumnByName('userType')!;
				expect(changedColumn.enumName).to.equal('UserTypeEnum');

				// revert changes
				await queryRunner.executeMemoryDownSql();

				// check if `enumName` reverted
				table = await queryRunner.getTable('user');
				changedColumn = table!.findColumnByName('userType')!;
				expect(changedColumn.enumName).to.undefined;

				await queryRunner.release();
			}),
		));
});
