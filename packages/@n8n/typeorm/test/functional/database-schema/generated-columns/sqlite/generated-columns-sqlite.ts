import 'reflect-metadata';
import { DataSource, TableColumn } from '../../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { expect } from 'chai';

describe('database schema > generated columns > sqlite', () => {
	let dataSources: DataSource[];
	before(async () => {
		dataSources = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['sqlite', 'sqlite-pooled'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should not generate queries when no model changes', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

				sqlInMemory.upQueries.length.should.be.equal(0);
				sqlInMemory.downQueries.length.should.be.equal(0);
			}),
		));

	it('should create table with generated columns', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();
				let table = await queryRunner.getTable('post');
				const virtualFullName = table!.findColumnByName('virtualFullName')!;
				const storedFullName = table!.findColumnByName('storedFullName')!;
				const name = table!.findColumnByName('name')!;

				virtualFullName.asExpression!.should.be.equal(`"firstName" || ' ' || "lastName"`);
				virtualFullName.generatedType!.should.be.equal('VIRTUAL');
				storedFullName.asExpression!.should.be.equal(`"firstName" || ' ' || "lastName"`);
				storedFullName.generatedType!.should.be.equal('STORED');

				name.asExpression!.should.be.equal(`"firstName" || "lastName"`);
				name.generatedType!.should.be.equal('STORED');

				await queryRunner.release();
			}),
		));

	it('should add generated column and revert add', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();

				let table = await queryRunner.getTable('post');

				let storedColumn = new TableColumn({
					name: 'storedColumn',
					type: 'varchar',
					length: '200',
					generatedType: 'STORED',
					asExpression: 'firstName || lastName',
				});

				let virtualColumn = new TableColumn({
					name: 'virtualColumn',
					type: 'varchar',
					length: '200',
					generatedType: 'VIRTUAL',
					asExpression: 'firstName || lastName',
				});

				await queryRunner.addColumn(table!, storedColumn);
				await queryRunner.addColumn(table!, virtualColumn);

				table = await queryRunner.getTable('post');

				storedColumn = table!.findColumnByName('storedColumn')!;
				storedColumn.should.be.exist;
				storedColumn!.generatedType!.should.be.equal('STORED');
				storedColumn!.asExpression!.should.be.equal('firstName || lastName');

				virtualColumn = table!.findColumnByName('virtualColumn')!;
				virtualColumn.should.be.exist;
				virtualColumn!.generatedType!.should.be.equal('VIRTUAL');
				virtualColumn!.asExpression!.should.be.equal('firstName || lastName');

				// revert changes
				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				expect(table!.findColumnByName('storedColumn')).to.be.undefined;
				expect(table!.findColumnByName('virtualColumn')).to.be.undefined;

				// check if generated column records removed from typeorm_metadata table
				const metadataRecords = await queryRunner.query(
					`SELECT * FROM "typeorm_metadata" WHERE "table" = 'post' AND "name" IN ('storedColumn', 'virtualColumn')`,
				);
				metadataRecords.length.should.be.equal(0);

				await queryRunner.release();
			}),
		));

	it('should drop generated column and revert drop', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();

				let table = await queryRunner.getTable('post');
				await queryRunner.dropColumn(table!, 'storedFullName');
				await queryRunner.dropColumn(table!, 'virtualFullName');

				table = await queryRunner.getTable('post');
				expect(table!.findColumnByName('storedFullName')).to.be.undefined;
				expect(table!.findColumnByName('virtualFullName')).to.be.undefined;

				// check if generated column records removed from typeorm_metadata table
				const metadataRecords = await queryRunner.query(
					`SELECT * FROM "typeorm_metadata" WHERE "table" = 'post' AND "name" IN ('storedFullName', 'virtualFullName')`,
				);
				metadataRecords.length.should.be.equal(0);

				// revert changes
				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');

				const storedFullName = table!.findColumnByName('storedFullName')!;
				storedFullName.should.be.exist;
				storedFullName!.generatedType!.should.be.equal('STORED');
				storedFullName!.asExpression!.should.be.equal(`"firstName" || ' ' || "lastName"`);

				const virtualFullName = table!.findColumnByName('virtualFullName')!;
				virtualFullName.should.be.exist;
				virtualFullName!.generatedType!.should.be.equal('VIRTUAL');
				virtualFullName!.asExpression!.should.be.equal(`"firstName" || ' ' || "lastName"`);

				await queryRunner.release();
			}),
		));

	it('should change generated column and revert change', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();

				let table = await queryRunner.getTable('post');

				let storedFullName = table!.findColumnByName('storedFullName')!;
				const changedStoredFullName = storedFullName.clone();
				changedStoredFullName.asExpression = `'Mr. ' || "firstName" || ' ' || "lastName"`;

				let name = table!.findColumnByName('name')!;
				const changedName = name.clone();
				changedName.generatedType = undefined;
				changedName.asExpression = undefined;

				await queryRunner.changeColumns(table!, [
					{
						oldColumn: storedFullName,
						newColumn: changedStoredFullName,
					},
					{ oldColumn: name, newColumn: changedName },
				]);

				table = await queryRunner.getTable('post');

				storedFullName = table!.findColumnByName('storedFullName')!;
				storedFullName!.asExpression!.should.be.equal(`'Mr. ' || "firstName" || ' ' || "lastName"`);

				name = table!.findColumnByName('name')!;
				expect(name!.generatedType).to.be.undefined;
				expect(name!.asExpression).to.be.undefined;

				// check if generated column records removed from typeorm_metadata table
				const metadataRecords = await queryRunner.query(
					`SELECT * FROM "typeorm_metadata" WHERE "table" = 'post' AND "name" = 'name'`,
				);
				metadataRecords.length.should.be.equal(0);

				// revert changes
				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');

				storedFullName = table!.findColumnByName('storedFullName')!;
				storedFullName!.asExpression!.should.be.equal(`"firstName" || ' ' || "lastName"`);

				name = table!.findColumnByName('name')!;
				name.generatedType!.should.be.equal('STORED');
				name.asExpression!.should.be.equal(`"firstName" || "lastName"`);

				await queryRunner.release();
			}),
		));

	it("should remove data from 'typeorm_metadata' when table dropped", () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();
				const table = await queryRunner.getTable('post');
				const generatedColumns = table!.columns.filter((it) => it.generatedType);

				await queryRunner.dropTable(table!);

				// check if generated column records removed from typeorm_metadata table
				let metadataRecords = await queryRunner.query(
					`SELECT * FROM "typeorm_metadata" WHERE "table" = 'post'`,
				);
				metadataRecords.length.should.be.equal(0);

				// revert changes
				await queryRunner.executeMemoryDownSql();

				metadataRecords = await queryRunner.query(
					`SELECT * FROM "typeorm_metadata" WHERE "table" = 'post'`,
				);
				metadataRecords.length.should.be.equal(generatedColumns.length);

				await queryRunner.release();
			}),
		));
});
