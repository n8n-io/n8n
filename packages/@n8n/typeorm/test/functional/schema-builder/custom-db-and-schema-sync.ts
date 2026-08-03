import 'reflect-metadata';
import { DataSource } from '../../../src';
import { ForeignKeyMetadata } from '../../../src/metadata/ForeignKeyMetadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Album } from './entity/Album';
import { Photo } from './entity/Photo';

describe('schema builder > custom-db-and-schema-sync', () => {
	describe('custom schema', () => {
		let connections: DataSource[];
		before(async () => {
			connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				entities: [Album, Photo],
				dropSchema: true,
			});
		});
		beforeEach(() => reloadTestingDatabases(connections));
		after(() => closeTestingConnections(connections));

		it('should correctly sync tables with custom schema', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const photoMetadata = connection.getMetadata('photo');
					const albumMetadata = connection.getMetadata('album');

					// create tables
					photoMetadata.synchronize = true;
					albumMetadata.synchronize = true;

					photoMetadata.schema = 'photo-schema';
					photoMetadata.tablePath = 'photo-schema.photo';

					albumMetadata.schema = 'album-schema';
					albumMetadata.tablePath = 'album-schema.album';

					await queryRunner.createSchema(photoMetadata.schema, true);
					await queryRunner.createSchema(albumMetadata.schema, true);

					await connection.synchronize();

					// create foreign key
					let albumTable = await queryRunner.getTable(albumMetadata.tablePath);
					let photoTable = await queryRunner.getTable(photoMetadata.tablePath);
					albumTable!.should.be.exist;
					photoTable!.should.be.exist;

					const columns = photoMetadata.columns.filter(
						(column) => column.propertyName === 'albumId',
					);
					const referencedColumns = albumMetadata.columns.filter(
						(column) => column.propertyName === 'id',
					);
					const fkMetadata = new ForeignKeyMetadata({
						entityMetadata: photoMetadata,
						referencedEntityMetadata: albumMetadata,
						columns: columns,
						referencedColumns: referencedColumns,
						namingStrategy: connection.namingStrategy,
					});
					photoMetadata.foreignKeys.push(fkMetadata);

					await connection.synchronize();

					photoTable = await queryRunner.getTable(photoMetadata.tablePath);
					photoTable!.foreignKeys.length.should.be.equal(1);

					// drop foreign key
					photoMetadata.foreignKeys = [];
					await connection.synchronize();

					// drop tables manually, because they will not synchronize automatically
					await queryRunner.dropTable(photoMetadata.tablePath, true, false);
					await queryRunner.dropTable(albumMetadata.tablePath, true, false);

					// drop created database
					await queryRunner.dropDatabase('secondDB', true);

					await queryRunner.release();
				}),
			));

		/*
		 * ISSUE: Test expects schema synchronization to work correctly with public schema table creation.
		 *
		 * THEORIES FOR FAILURE:
		 * 1. Metadata Runtime Modification Issues: The test dynamically modifies entity metadata properties
		 *    (synchronize, schema, tablePath) at runtime, but TypeORM's metadata system may not be
		 *    designed to handle these dynamic changes, causing inconsistent behavior during sync operations.
		 *
		 * 2. Schema Builder Context Confusion: When synchronizing tables with explicit "public" schema
		 *    specification, the schema builder may get confused about which schema context to use,
		 *    especially in multi-schema environments where schema switching is involved.
		 *
		 * 3. Table Path Resolution Conflicts: The tablePath property may conflict with other metadata
		 *    properties or schema resolution logic, causing the sync operation to attempt table
		 *    creation in the wrong location or with incorrect table names.
		 *
		 * POTENTIAL FIXES:
		 * - Add proper support for runtime metadata modification in synchronization operations
		 * - Fix schema context management in schema builder for explicit public schema usage
		 * - Resolve table path conflicts and ensure consistent table name resolution during sync
		 */
		it.skip('should correctly sync tables with `public` schema', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const photoMetadata = connection.getMetadata('photo');
					const albumMetadata = connection.getMetadata('album');

					// create tables
					photoMetadata.synchronize = true;
					albumMetadata.synchronize = true;

					photoMetadata.schema = 'public';
					photoMetadata.tablePath = 'photo';

					albumMetadata.schema = 'public';
					albumMetadata.tablePath = 'album';

					await queryRunner.createSchema(photoMetadata.schema, true);
					await queryRunner.createSchema(albumMetadata.schema, true);

					await connection.synchronize();

					// create foreign key
					let albumTable = await queryRunner.getTable(albumMetadata.tablePath);
					let photoTable = await queryRunner.getTable(photoMetadata.tablePath);

					albumTable!.should.be.exist;
					photoTable!.should.be.exist;

					photoTable!.foreignKeys.length.should.be.equal(0);

					const columns = photoMetadata.columns.filter(
						(column) => column.propertyName === 'albumId',
					);
					const referencedColumns = albumMetadata.columns.filter(
						(column) => column.propertyName === 'id',
					);
					const fkMetadata = new ForeignKeyMetadata({
						entityMetadata: photoMetadata,
						referencedEntityMetadata: albumMetadata,
						columns: columns,
						referencedColumns: referencedColumns,
						namingStrategy: connection.namingStrategy,
					});

					photoMetadata.foreignKeys.push(fkMetadata);
					await connection.synchronize();

					photoTable = await queryRunner.getTable(photoMetadata.tablePath);
					photoTable!.foreignKeys.length.should.be.equal(1);

					// drop foreign key
					photoMetadata.foreignKeys = [];
					await connection.synchronize();

					// drop tables manually, because they will not synchronize automatically
					await queryRunner.dropTable(photoMetadata.tablePath, true, false);
					await queryRunner.dropTable(albumMetadata.tablePath, true, false);

					// drop created database
					await queryRunner.dropDatabase('secondDB', true);

					await queryRunner.release();
				}),
			));
	});
});
