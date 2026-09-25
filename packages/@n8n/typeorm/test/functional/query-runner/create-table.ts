import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { Table } from '../../../src/schema-builder/table/Table';
import { TableOptions } from '../../../src/schema-builder/options/TableOptions';
import { Post } from './entity/Post';
import { Photo } from './entity/Photo';
import { Book2, Book } from './entity/Book';
import { DriverUtils } from '../../../src/driver/DriverUtils';

describe('query runner > create table', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('should correctly create table from simple object and revert creation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let numericType = 'int';
				if (DriverUtils.isSQLiteFamily(connection.driver)) {
					numericType = 'integer';
				}

				const options: TableOptions = {
					name: 'category',
					columns: [
						{
							name: 'id',
							type: numericType,
							isPrimary: true,
							isGenerated: true,
							generationStrategy: 'increment',
						},
						{
							name: 'name',
							type: 'varchar',
							isUnique: true,
							isNullable: false,
						},
					],
				};

				await queryRunner.createTable(new Table(options), true);

				let table = await queryRunner.getTable('category');
				const idColumn = table!.findColumnByName('id');
				const nameColumn = table!.findColumnByName('name');
				idColumn!.should.be.exist;
				idColumn!.isPrimary.should.be.true;
				idColumn!.isGenerated.should.be.true;
				idColumn!.generationStrategy!.should.be.equal('increment');
				nameColumn!.should.be.exist;
				nameColumn!.isUnique.should.be.true;
				table!.should.exist;

				table!.uniques.length.should.be.equal(1);

				await queryRunner.executeMemoryDownSql();
				table = await queryRunner.getTable('category');
				expect(table).to.be.undefined;

				await queryRunner.release();
			}),
		));

	it('should correctly create table from Entity', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const metadata = connection.getMetadata(Post);
				const newTable = Table.create(metadata, connection.driver);
				await queryRunner.createTable(newTable);

				const table = await queryRunner.getTable('post');
				const idColumn = table!.findColumnByName('id');
				const versionColumn = table!.findColumnByName('version');

				table!.should.exist;

				table!.uniques.length.should.be.equal(2);
				table!.checks.length.should.be.equal(1);

				idColumn!.isPrimary.should.be.true;
				versionColumn!.isUnique.should.be.true;

				await queryRunner.release();
			}),
		));

	it('should correctly create table with all dependencies and revert creation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let numericType = 'int';
				if (DriverUtils.isSQLiteFamily(connection.driver)) {
					numericType = 'integer';
				}

				let stringType = 'varchar';

				await queryRunner.createTable(
					new Table({
						name: 'person',
						columns: [
							{
								name: 'id',
								type: numericType,
								isPrimary: true,
							},
							{
								name: 'userId',
								type: numericType,
								isPrimary: true,
							},
							{
								name: 'name',
								type: stringType,
							},
						],
					}),
					true,
				);

				const questionTableOptions = <TableOptions>{
					name: 'question',
					columns: [
						{
							name: 'id',
							type: numericType,
							isPrimary: true,
							isGenerated: true,
							generationStrategy: 'increment',
						},
						{
							name: 'name',
							type: stringType,
						},
						{
							name: 'text',
							type: stringType,
							isNullable: false,
						},
						{
							name: 'authorId',
							type: numericType,
						},
						{
							name: 'authorUserId',
							type: numericType,
						},
					],
					indices: [
						{
							columnNames: ['authorId', 'authorUserId'],
							isUnique: true,
						},
					],
					foreignKeys: [
						{
							columnNames: ['authorId', 'authorUserId'],
							referencedTableName: 'person',
							referencedColumnNames: ['id', 'userId'],
						},
					],
				};

				questionTableOptions.uniques = [{ columnNames: ['name', 'text'] }];
				questionTableOptions.checks = [
					{
						expression: `${connection.driver.escape('name')} <> 'ASD'`,
					},
				];

				await queryRunner.createTable(new Table(questionTableOptions), true);

				const categoryTableOptions = <TableOptions>{
					name: 'category',
					columns: [
						{
							name: 'id',
							type: numericType,
							isPrimary: true,
							isGenerated: true,
							generationStrategy: 'increment',
						},
						{
							name: 'name',
							type: stringType,
							default: "'default category'",
							isUnique: true,
							isNullable: false,
						},
						{
							name: 'alternativeName',
							type: stringType,
						},
						{
							name: 'questionId',
							type: numericType,
							isUnique: true,
						},
					],
					foreignKeys: [
						{
							columnNames: ['questionId'],
							referencedTableName: 'question',
							referencedColumnNames: ['id'],
						},
					],
				};

				categoryTableOptions.uniques = [{ columnNames: ['name', 'alternativeName'] }];

				// When we mark column as unique, MySql create index for that column and we don't need to create index separately.
				categoryTableOptions.indices = [{ columnNames: ['questionId'] }];

				await queryRunner.createTable(new Table(categoryTableOptions), true);

				let personTable = await queryRunner.getTable('person');
				const personIdColumn = personTable!.findColumnByName('id');
				const personUserIdColumn = personTable!.findColumnByName('id');
				personIdColumn!.isPrimary.should.be.true;
				personUserIdColumn!.isPrimary.should.be.true;
				personTable!.should.exist;

				let questionTable = await queryRunner.getTable('question');
				const questionIdColumn = questionTable!.findColumnByName('id');
				questionIdColumn!.isPrimary.should.be.true;
				questionTable!.should.exist;

				questionTable!.uniques.length.should.be.equal(1);
				questionTable!.uniques[0].columnNames.length.should.be.equal(2);
				questionTable!.indices.length.should.be.equal(1);
				questionTable!.indices[0].columnNames.length.should.be.equal(2);
				questionTable!.checks.length.should.be.equal(1);

				questionTable!.foreignKeys.length.should.be.equal(1);
				questionTable!.foreignKeys[0].columnNames.length.should.be.equal(2);
				questionTable!.foreignKeys[0].referencedColumnNames.length.should.be.equal(2);

				let categoryTable = await queryRunner.getTable('category');
				const categoryTableIdColumn = categoryTable!.findColumnByName('id');
				categoryTableIdColumn!.isPrimary.should.be.true;
				categoryTable!.should.exist;
				categoryTable!.foreignKeys.length.should.be.equal(1);

				categoryTable!.uniques.length.should.be.equal(3);
				categoryTable!.indices.length.should.be.equal(1);

				await queryRunner.executeMemoryDownSql();

				questionTable = await queryRunner.getTable('question');
				categoryTable = await queryRunner.getTable('category');
				personTable = await queryRunner.getTable('person');
				expect(questionTable).to.be.undefined;
				expect(categoryTable).to.be.undefined;
				expect(personTable).to.be.undefined;

				await queryRunner.release();
			}),
		));

	it('should correctly create table with different `Unique` definitions', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const metadata = connection.getMetadata(Photo);
				const newTable = Table.create(metadata, connection.driver);
				await queryRunner.createTable(newTable);

				let table = await queryRunner.getTable('photo');
				const nameColumn = table!.findColumnByName('name');
				const tagColumn = table!.findColumnByName('tag');
				const descriptionColumn = table!.findColumnByName('description');
				const textColumn = table!.findColumnByName('text');

				table!.should.exist;
				nameColumn!.isUnique.should.be.true;
				descriptionColumn!.isUnique.should.be.true;

				table!.uniques.length.should.be.equal(2);
				table!.indices.length.should.be.equal(2);
				tagColumn!.isUnique.should.be.false;
				textColumn!.isUnique.should.be.false;

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('photo');
				expect(table).to.be.undefined;

				await queryRunner.release();
			}),
		));

	it('should correctly create table with different `withoutRowid` definitions', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!DriverUtils.isSQLiteFamily(connection.driver)) return;

				const queryRunner = connection.createQueryRunner();

				// the table 'book' must contain a 'rowid' column
				const metadataBook = connection.getMetadata(Book);
				const newTableBook = Table.create(metadataBook, connection.driver);
				await queryRunner.createTable(newTableBook);
				const aBook = new Book();
				aBook.ean = 'asdf';
				await connection.manager.save(aBook);

				const desc = await connection.manager.query("SELECT rowid FROM book WHERE ean = 'asdf'");
				expect(desc[0].rowid).equals(1);

				await queryRunner.dropTable('book');
				const bookTableIsGone = await queryRunner.getTable('book');
				expect(bookTableIsGone).to.be.undefined;

				// the table 'book2' must NOT contain a 'rowid' column
				const metadataBook2 = connection.getMetadata(Book2);
				const newTableBook2 = Table.create(metadataBook2, connection.driver);
				await queryRunner.createTable(newTableBook2);

				try {
					await connection.manager.query('SELECT rowid FROM book2');
				} catch (e) {
					expect(e.message).contains('no such column: rowid');
				}

				await queryRunner.dropTable('book2');
				const book2TableIsGone = await queryRunner.getTable('book2');
				expect(book2TableIsGone).to.be.undefined;

				await queryRunner.release();
			}),
		));
});
