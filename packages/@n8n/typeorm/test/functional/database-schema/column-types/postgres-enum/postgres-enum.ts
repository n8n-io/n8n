import 'reflect-metadata';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { Post } from './entity/Post';
import { Table, TableColumn } from '../../../../../src';

describe('database schema > column types > postgres-enum', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should create table with ENUM column and save data to it', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				const post = new Post();
				post.enum = 'A';
				post.enumArray = ['A', 'B'];
				post.enumArray2 = ['A', 'C'];
				post.simpleEnum = 'A';
				post.name = 'Post #1';
				await postRepository.save(post);

				const loadedPost = (await postRepository.findOneBy({
					id: 1,
				}))!;
				loadedPost.enum.should.be.equal(post.enum);
				loadedPost.enumArray.should.be.deep.equal(post.enumArray);
				loadedPost.enumArray2.should.be.deep.equal(post.enumArray2);
				loadedPost.simpleEnum.should.be.equal(post.simpleEnum);

				table!.findColumnByName('enum')!.type.should.be.equal('enum');
				table!.findColumnByName('enumArray')!.type.should.be.equal('enum');
				table!.findColumnByName('enumArray2')!.type.should.be.equal('enum');
				table!.findColumnByName('enumArray')!.isArray.should.be.true;
				table!.findColumnByName('simpleEnum')!.type.should.be.equal('enum');
			}),
		));

	it('should create ENUM column and revert creation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				await queryRunner.addColumn(
					'post',
					new TableColumn({
						name: 'newEnum',
						type: 'enum',
						enum: ['Apple', 'Pineapple'],
					}),
				);

				let table = await queryRunner.getTable('post');
				table!.findColumnByName('newEnum')!.type.should.be.equal('enum');

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				expect(table!.findColumnByName('newEnum')).to.be.undefined;

				await queryRunner.release();
			}),
		));

	it('should drop ENUM column and revert drop', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('post');
				const enumColumn = table!.findColumnByName('enum')!;

				await queryRunner.dropColumn(table!, enumColumn);
				expect(table!.findColumnByName('enum')).to.be.undefined;

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				table!.findColumnByName('enum')!.type.should.be.equal('enum');

				await queryRunner.release();
			}),
		));

	it('should create table with ENUM column and revert creation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createTable(
					new Table({
						name: 'question',
						columns: [
							{
								name: 'enum',
								type: 'enum',
								enum: ['Apple', 'Banana', 'Cherry'],
							},
						],
					}),
				);

				let table = await queryRunner.getTable('question');
				const enumColumn = table!.findColumnByName('enum')!;
				enumColumn.type.should.be.equal('enum');
				enumColumn.enum!.should.be.eql(['Apple', 'Banana', 'Cherry']);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('question');
				expect(table).to.be.undefined;

				await queryRunner.release();
			}),
		));

	it('should drop table with ENUM column and revert drop', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				await queryRunner.dropTable('post');

				let table = await queryRunner.getTable('post');
				expect(table).to.be.undefined;

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				expect(table).to.be.not.undefined;

				await queryRunner.release();
			}),
		));

	it('should change non-enum column in to ENUM and revert change', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('post');
				let nameColumn = table!.findColumnByName('name')!;
				let changedColumn = nameColumn.clone();
				changedColumn.type = 'enum';
				changedColumn.enum = ['Apple', 'Banana', 'Cherry'];

				await queryRunner.changeColumn(table!, nameColumn, changedColumn);

				table = await queryRunner.getTable('post');
				changedColumn = table!.findColumnByName('name')!;
				changedColumn.type.should.be.equal('enum');
				changedColumn.enum!.should.be.eql(['Apple', 'Banana', 'Cherry']);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				nameColumn = table!.findColumnByName('name')!;
				nameColumn.type.should.be.equal('character varying');
				expect(nameColumn.enum).to.be.undefined;

				await queryRunner.release();
			}),
		));

	it('should change ENUM column in to non-enum and revert change', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('post');
				let enumColumn = table!.findColumnByName('enum')!;
				let changedColumn = enumColumn.clone();
				changedColumn.type = 'character varying';
				changedColumn.enum = undefined;

				await queryRunner.changeColumn(table!, enumColumn, changedColumn);

				table = await queryRunner.getTable('post');
				changedColumn = table!.findColumnByName('enum')!;
				changedColumn.type.should.be.equal('character varying');
				expect(changedColumn.enum).to.be.undefined;

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				enumColumn = table!.findColumnByName('enum')!;
				enumColumn.type.should.be.equal('enum');
				enumColumn.enum!.should.be.eql(['A', 'B', 'C']);

				await queryRunner.release();
			}),
		));

	it('should change ENUM array column in to non-array and revert change', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('post');
				let enumColumn = table!.findColumnByName('enumArray')!;
				let changedColumn = enumColumn.clone();
				changedColumn.isArray = false;

				await queryRunner.changeColumn(table!, enumColumn, changedColumn);

				table = await queryRunner.getTable('post');
				changedColumn = table!.findColumnByName('enumArray')!;
				changedColumn.isArray.should.be.false;

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				enumColumn = table!.findColumnByName('enumArray')!;
				enumColumn.isArray.should.be.true;

				await queryRunner.release();
			}),
		));

	it('should change ENUM value and revert change', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('post');
				const enumColumn = table!.findColumnByName('enum')!;
				const changedColumn = enumColumn.clone();
				changedColumn.enum = ['C', 'D', 'E'];

				await queryRunner.changeColumn(table!, enumColumn, changedColumn);

				table = await queryRunner.getTable('post');
				table!.findColumnByName('enum')!.enum!.should.be.eql(['C', 'D', 'E']);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				table!.findColumnByName('enum')!.enum!.should.be.eql(['A', 'B', 'C']);

				await queryRunner.release();
			}),
		));

	it('should change `enumName` and revert change', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				// add `enumName`
				let table = await queryRunner.getTable('post');
				const column = table!.findColumnByName('enum')!;
				const newColumn = column.clone();
				newColumn.enumName = 'PostTypeEnum';

				// change column
				await queryRunner.changeColumn(table!, column, newColumn);

				// check if `enumName` changed
				table = await queryRunner.getTable('post');
				let changedColumn = table!.findColumnByName('enum')!;
				expect(changedColumn.enumName).to.equal('PostTypeEnum');

				// revert changes
				await queryRunner.executeMemoryDownSql();

				// check if `enumName` reverted
				table = await queryRunner.getTable('post');
				changedColumn = table!.findColumnByName('enum')!;
				expect(changedColumn.enumName).to.undefined;

				await queryRunner.release();
			}),
		));

	it('should not create new type if same `enumName` is used more than once', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				const table = new Table({
					name: 'my_table',
					columns: [
						{
							name: 'enum1',
							type: 'enum',
							enum: ['Apple', 'Banana', 'Cherry'],
							enumName: 'Fruits',
						},
						{
							name: 'enum2',
							type: 'enum',
							enum: ['Apple', 'Banana', 'Cherry'],
							enumName: 'Fruits',
						},
						{
							name: 'enum3',
							type: 'enum',
							enumName: 'Fruits',
						},
					],
				});

				await queryRunner.createTable(table);

				// revert changes
				await queryRunner.executeMemoryDownSql();

				await queryRunner.release();
			}),
		));

	it('should change both ENUM value and ENUM name and revert change', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('post');
				const enumColumn = table!.findColumnByName('enum')!;
				const changedColumn = enumColumn.clone();
				changedColumn.enum = ['C', 'D', 'E'];
				changedColumn.enumName = 'my_enum_type';

				await queryRunner.changeColumn(table!, enumColumn, changedColumn);

				table = await queryRunner.getTable('post');
				const columnAfterChange = table!.findColumnByName('enum')!;
				columnAfterChange.enum!.should.be.eql(['C', 'D', 'E']);
				columnAfterChange.enumName!.should.be.eql('my_enum_type');

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				const columnAfterRevert = table!.findColumnByName('enum')!;
				columnAfterRevert.enum!.should.be.eql(['A', 'B', 'C']);
				expect(columnAfterRevert.enumName).to.undefined;

				await queryRunner.release();
			}),
		));

	it('should rename ENUM when column renamed and revert rename', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const currentSchemaQuery = await queryRunner.query(`SELECT * FROM current_schema()`);
				const currentSchema = currentSchemaQuery[0]['current_schema'];
				const table = await queryRunner.getTable('post');
				const enumColumn = table!.findColumnByName('enum')!;
				const changedColumn = enumColumn.clone();
				changedColumn.name = 'enumerable';

				await queryRunner.changeColumn(table!, enumColumn, changedColumn);

				let result = await queryRunner.query(
					`SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
						`INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
						`WHERE "n"."nspname" = '${currentSchema}' AND "t"."typname" = 'post_enumerable_enum'`,
				);
				result.length.should.be.equal(1);

				await queryRunner.executeMemoryDownSql();

				result = await queryRunner.query(
					`SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
						`INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
						`WHERE "n"."nspname" = '${currentSchema}' AND "t"."typname" = 'post_enum_enum'`,
				);
				result.length.should.be.equal(1);

				await queryRunner.release();
			}),
		));

	it('should rename ENUM when table renamed and revert rename', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const currentSchemaQuery = await queryRunner.query(`SELECT * FROM current_schema()`);
				const currentSchema = currentSchemaQuery[0]['current_schema'];
				const table = await queryRunner.getTable('post');

				await queryRunner.renameTable(table!, 'question');

				let result = await queryRunner.query(
					`SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
						`INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
						`WHERE "n"."nspname" = '${currentSchema}' AND "t"."typname" = 'question_enum_enum'`,
				);
				result.length.should.be.equal(1);

				await queryRunner.executeMemoryDownSql();

				result = await queryRunner.query(
					`SELECT "n"."nspname", "t"."typname" FROM "pg_type" "t" ` +
						`INNER JOIN "pg_namespace" "n" ON "n"."oid" = "t"."typnamespace" ` +
						`WHERE "n"."nspname" = '${currentSchema}' AND "t"."typname" = 'post_enum_enum'`,
				);
				result.length.should.be.equal(1);

				await queryRunner.release();
			}),
		));
});
