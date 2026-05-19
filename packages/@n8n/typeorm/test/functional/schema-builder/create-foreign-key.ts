import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { ForeignKeyMetadata } from '../../../src/metadata/ForeignKeyMetadata';

describe('schema builder > create foreign key', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly create foreign key', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryMetadata = connection.getMetadata('category');
				const postMetadata = connection.getMetadata('post');
				const columns = categoryMetadata.columns.filter(
					(column) => ['postText', 'postTag'].indexOf(column.propertyName) !== -1,
				);
				const referencedColumns = postMetadata.columns.filter(
					(column) => ['text', 'tag'].indexOf(column.propertyName) !== -1,
				);

				const fkMetadata = new ForeignKeyMetadata({
					entityMetadata: categoryMetadata,
					referencedEntityMetadata: postMetadata,
					columns: columns,
					referencedColumns: referencedColumns,
					namingStrategy: connection.namingStrategy,
				});
				categoryMetadata.foreignKeys.push(fkMetadata);

				await connection.synchronize();

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('category');
				await queryRunner.release();

				table!.foreignKeys.length.should.be.equal(1);
				table!.indices.length.should.be.equal(0);
			}),
		));
});
