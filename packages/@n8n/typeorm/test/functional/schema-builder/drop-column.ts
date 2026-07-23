import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { expect } from 'chai';

describe('schema builder > drop column', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('should correctly drop column', () =>
		Promise.all(
			connections.map(async (connection) => {
				const studentMetadata = connection.getMetadata('student');
				const removedColumns = studentMetadata.columns.filter(
					(column) => ['name', 'faculty'].indexOf(column.propertyName) !== -1,
				);
				removedColumns.forEach((column) => {
					studentMetadata.columns.splice(studentMetadata.columns.indexOf(column), 1);
				});

				// in real sync indices removes automatically
				studentMetadata.indices = studentMetadata.indices.filter((index) => {
					return !index.columns.find(
						(column) => ['name', 'facultyId'].indexOf(column.databaseName) !== -1,
					);
				});

				const removedForeignKey = studentMetadata.foreignKeys.find((fk) => {
					return !!fk.columns.find((column) => column.propertyName === 'faculty');
				});
				studentMetadata.foreignKeys.splice(
					studentMetadata.foreignKeys.indexOf(removedForeignKey!),
					1,
				);

				await connection.synchronize();

				const queryRunner = connection.createQueryRunner();
				const studentTable = await queryRunner.getTable('student');
				await queryRunner.release();

				expect(studentTable!.findColumnByName('name')).to.be.undefined;
				expect(studentTable!.findColumnByName('faculty')).to.be.undefined;

				studentTable!.indices.length.should.be.equal(0);
				studentTable!.foreignKeys.length.should.be.equal(1);
			}),
		));
});
