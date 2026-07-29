import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource, Table } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { DriverUtils } from '../../../src/driver/DriverUtils';

describe('query runner > rename column', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('should correctly rename column and revert rename', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('post');
				const textColumn = table!.findColumnByName('text')!;

				const renamedTextColumn = textColumn!.clone();
				renamedTextColumn.name = 'description';

				await queryRunner.renameColumn(table!, textColumn, renamedTextColumn);
				await queryRunner.renameColumn(table!, 'name', 'title');

				table = await queryRunner.getTable('post');
				expect(table!.findColumnByName('name')).to.be.undefined;
				expect(table!.findColumnByName('text')).to.be.undefined;
				table!.findColumnByName('title')!.should.be.exist;
				table!.findColumnByName('description')!.should.be.exist;

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				table!.findColumnByName('name')!.should.be.exist;
				table!.findColumnByName('text')!.should.be.exist;
				expect(table!.findColumnByName('title')).to.be.undefined;
				expect(table!.findColumnByName('description')).to.be.undefined;

				await queryRunner.release();
			}),
		));

	it('should correctly rename column with all constraints and revert rename', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('post');
				const idColumn = table!.findColumnByName('id')!;
				await queryRunner.renameColumn(table!, idColumn, 'id2');

				// should successfully drop pk if pk constraint was correctly renamed.
				table = await queryRunner.getTable('post');
				expect(table!.findColumnByName('id')).to.be.undefined;
				table!.findColumnByName('id2')!.should.be.exist;

				// MySql and SAP does not support unique constraints

				const oldUniqueConstraintName = connection.namingStrategy.uniqueConstraintName(table!, [
					'text',
					'tag',
				]);
				let tableUnique = table!.uniques.find((unique) => {
					return !!unique.columnNames.find((columnName) => columnName === 'tag');
				});
				tableUnique!.name!.should.be.equal(oldUniqueConstraintName);

				await queryRunner.renameColumn(table!, 'text', 'text2');

				table = await queryRunner.getTable('post');
				const newUniqueConstraintName = connection.namingStrategy.uniqueConstraintName(table!, [
					'text2',
					'tag',
				]);
				tableUnique = table!.uniques.find((unique) => {
					return !!unique.columnNames.find((columnName) => columnName === 'tag');
				});
				tableUnique!.name!.should.be.equal(newUniqueConstraintName);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				table!.findColumnByName('id')!.should.be.exist;
				expect(table!.findColumnByName('id2')).to.be.undefined;

				await queryRunner.release();
			}),
		));

	it('should correctly rename column with all constraints in custom table schema and database and revert rename', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table: Table | undefined;

				let questionTableName: string = 'question';
				let categoryTableName: string = 'category';

				// create different names to test renaming with custom schema and database.
				if (connection.driver.options.type === 'postgres') {
					questionTableName = 'testSchema.question';
					categoryTableName = 'testSchema.category';
					await queryRunner.createSchema('testSchema', true);
				}

				await queryRunner.createTable(
					new Table({
						name: questionTableName,
						columns: [
							{
								name: 'id',
								type: DriverUtils.isSQLiteFamily(connection.driver) ? 'integer' : 'int',
								isPrimary: true,
								isGenerated: true,
								generationStrategy: 'increment',
							},
							{
								name: 'name',
								type: 'varchar',
							},
						],
						indices: [{ columnNames: ['name'] }],
					}),
					true,
				);

				await queryRunner.createTable(
					new Table({
						name: categoryTableName,
						columns: [
							{
								name: 'id',
								type: DriverUtils.isSQLiteFamily(connection.driver) ? 'integer' : 'int',
								isPrimary: true,
								isGenerated: true,
								generationStrategy: 'increment',
							},
							{
								name: 'questionId',
								type: 'int',
								isUnique: true,
							},
						],
						foreignKeys: [
							{
								columnNames: ['questionId'],
								referencedTableName: questionTableName,
								referencedColumnNames: ['id'],
							},
						],
					}),
					true,
				);

				// clear sqls in memory to avoid removing tables when down queries executed.
				queryRunner.clearSqlMemory();

				await queryRunner.renameColumn(questionTableName, 'name', 'name2');
				table = await queryRunner.getTable(questionTableName);
				const newIndexName = connection.namingStrategy.indexName(table!, ['name2']);
				table!.indices[0].name!.should.be.equal(newIndexName);

				await queryRunner.renameColumn(categoryTableName, 'questionId', 'questionId2');
				table = await queryRunner.getTable(categoryTableName);
				const newForeignKeyName = connection.namingStrategy.foreignKeyName(
					table!,
					['questionId2'],
					'question',
					['id'],
				);
				table!.foreignKeys[0].name!.should.be.equal(newForeignKeyName);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable(questionTableName);
				table!.findColumnByName('name')!.should.be.exist;
				expect(table!.findColumnByName('name2')).to.be.undefined;

				table = await queryRunner.getTable(categoryTableName);
				table!.findColumnByName('questionId')!.should.be.exist;
				expect(table!.findColumnByName('questionId2')).to.be.undefined;

				await queryRunner.release();
			}),
		));
});
