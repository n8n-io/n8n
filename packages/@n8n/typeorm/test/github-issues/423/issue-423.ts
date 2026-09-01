import 'reflect-metadata';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';

describe('github issues > #423 Cannot use Group as Table name && cannot autoSchemeSync when use alias Entity', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: false,
				dropSchema: true,
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should successfully sync schema', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.synchronize();

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('groups');
				await queryRunner.release();

				table!.should.exist;

				table!.indices.length.should.be.equal(1);
				table!.indices[0].name!.should.be.equal('Groups name');
				table!.indices[0].columnNames[0].should.be.equal('name');
				table!.indices[0].isUnique!.should.be.true;
			}),
		));
});
