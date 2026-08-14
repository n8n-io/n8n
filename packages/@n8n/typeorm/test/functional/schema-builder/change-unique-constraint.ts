import 'reflect-metadata';
import { DataSource } from '../../../src';
import { UniqueMetadata } from '../../../src/metadata/UniqueMetadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Post } from './entity/Post';
import { Teacher } from './entity/Teacher';
import { DriverUtils } from '../../../src/driver/DriverUtils';

describe('schema builder > change unique constraint', () => {
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

	it('should correctly add new unique constraint', () =>
		Promise.all(
			connections.map(async (connection) => {
				const teacherMetadata = connection.getMetadata(Teacher);
				const nameColumn = teacherMetadata.findColumnWithPropertyName('name')!;
				let uniqueMetadata: UniqueMetadata | undefined = undefined;

				// Mysql and SAP stores unique constraints as unique indices.

				uniqueMetadata = new UniqueMetadata({
					entityMetadata: teacherMetadata,
					columns: [nameColumn],
					args: {
						target: Teacher,
					},
				});
				uniqueMetadata.build(connection.namingStrategy);
				teacherMetadata.uniques.push(uniqueMetadata);

				await connection.synchronize();

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('teacher');
				await queryRunner.release();

				table!.uniques.length.should.be.equal(1);

				// revert changes
				teacherMetadata.uniques.splice(teacherMetadata.uniques.indexOf(uniqueMetadata!), 1);
			}),
		));

	it('should correctly change unique constraint', () =>
		Promise.all(
			connections.map(async (connection) => {
				// Sqlite does not store unique constraint name
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				const postMetadata = connection.getMetadata(Post);

				const uniqueMetadata = postMetadata.uniques.find((uq) => uq.columns.length === 2);
				uniqueMetadata!.name = 'changed_unique';

				await connection.synchronize();

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				const tableUnique = table!.uniques.find((unique) => unique.columnNames.length === 2);
				tableUnique!.name!.should.be.equal('changed_unique');

				// revert changes
				const revertMetadata = postMetadata.uniques.find((i) => i.name === 'changed_unique');
				revertMetadata!.name = connection.namingStrategy.uniqueConstraintName(
					table!,
					revertMetadata!.columns.map((c) => c.databaseName),
				);
			}),
		));

	it('should correctly drop removed unique constraint', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postMetadata = connection.getMetadata(Post);

				const unique = postMetadata!.uniques.find((u) => u.columns.length === 2);
				postMetadata!.uniques.splice(postMetadata!.uniques.indexOf(unique!), 1);

				await connection.synchronize();

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				table!.uniques.length.should.be.equal(1);
			}),
		));
});
