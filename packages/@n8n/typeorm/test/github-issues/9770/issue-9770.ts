import 'reflect-metadata';
import { expect } from 'chai';

import { DataSource } from '../../../src';
//import { DataSource, TableColumn } from "../../../src"
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

import { Foo } from './entity/Foo';
import { Bar } from './entity/Bar';

describe('github issues > #9770 check for referencing foreign keys when altering a table using sqlite', () => {
	let dataSources: DataSource[];
	before(async () => {
		dataSources = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			migrations: [__dirname + '/migration/*{.js,.ts}'],
			enabledDrivers: ['sqlite', 'sqlite-pooled'],
			schemaCreate: true,
			dropSchema: true,
			logging: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it("shouldn't loose dependant table data", () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const manager = dataSource.manager;

				// Insert records in the tables
				const foo = new Foo();
				foo.data = 'foo';
				await manager.save(foo);
				const foundFoo = await manager.findOne(Foo, {
					where: {
						id: 1,
					},
				});
				expect(foundFoo).not.to.be.null;

				if (!foundFoo) return;

				const bar = new Bar();
				bar.foo = foundFoo;
				bar.data = 'bar';
				await manager.save(bar);

				const foundBar = await manager.findOne(Bar, {
					where: {
						foo: {
							id: foundFoo.id,
						},
					},
				});
				expect(foundBar).not.to.be.null;

				// check current state (migrations pending and entries in db)
				const migrations = await dataSource.showMigrations();
				migrations.should.be.equal(true);

				const queryRunner = dataSource.createQueryRunner();
				let barRecords = await queryRunner.query(`SELECT * FROM "bar"`);
				expect(barRecords).to.have.lengthOf.above(0);

				// run migrations which contains a table drop
				await dataSource.runMigrations();

				// check post migration (no more pending migration and data still in db)
				const migrations2 = await dataSource.showMigrations();
				migrations2.should.be.equal(false);

				// check if data still exists in dependant table
				barRecords = await queryRunner.query(`SELECT * FROM "bar"`);
				expect(barRecords).to.have.lengthOf.above(0);

				// revert changes
				await queryRunner.executeMemoryDownSql();

				await queryRunner.release();
			}),
		));
});
