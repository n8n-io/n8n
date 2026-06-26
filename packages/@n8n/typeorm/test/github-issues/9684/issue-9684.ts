import 'reflect-metadata';
import { DataSource } from '../../../src/index';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { Foo } from './entity/Foo';

describe('github issues > #9684 Incorrect enum default value when table name contains dash character', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Foo],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	after(() => closeTestingConnections(connections));
	it('should get default enum value', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('module-foo_table_x');

				const nameColumn = table!.findColumnByName('enumStatus')!;
				nameColumn!.default!.should.be.equal("'draft'");
			}),
		));
});
