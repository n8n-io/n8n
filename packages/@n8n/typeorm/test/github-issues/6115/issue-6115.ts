import 'reflect-metadata';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	setupSingleTestingConnection,
} from '../../utils/test-utils';
import { fail } from 'assert';
import { expect } from 'chai';

describe('github issues > #6115 Down migration for enums with defaults are wrong', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				entities: [__dirname + '/entity/v1/*{.js,.ts}'],
				dropSchema: true,
				schemaCreate: true,
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should change schema when enum definition changes', () =>
		Promise.all(
			connections.map(async (_connection) => {
				const options = setupSingleTestingConnection(_connection.options.type, {
					name: `${_connection.name}-v2`,
					entities: [__dirname + '/entity/v2/*{.js,.ts}'],
					dropSchema: false,
					schemaCreate: false,
				});
				if (!options) {
					fail();
					return;
				}

				const dataSource = new DataSource(options);
				await dataSource.initialize();
				const queryRunner = dataSource.createQueryRunner();

				const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

				const upQueries = sqlInMemory.upQueries.map((query) => query.query);
				const downQueries = sqlInMemory.downQueries.map((query) => query.query);

				// update entity
				for (const query of upQueries) {
					await dataSource.query(query);
				}

				let table = await queryRunner.getTable('metric');
				let defaultOperator = table!.findColumnByName('defaultOperator');
				expect(defaultOperator!.enum!.sort()).to.deep.equal(
					['lessthan', 'lessequal', 'equal', 'notequal', 'greaterequal', 'greaterthan'].sort(),
				);
				expect(defaultOperator!.default).to.equal(`'equal'`);

				let defaultOperator2 = table!.findColumnByName('defaultOperator2');
				expect(defaultOperator2!.default).to.equal(`'equal'`);

				let defaultOperator3 = table!.findColumnByName('defaultOperator3');
				expect(defaultOperator3!.default).to.be.undefined;

				let defaultOperator4 = table!.findColumnByName('defaultOperator4');
				expect(defaultOperator4!.default).to.equal(`'greaterthan'`);

				// revert update
				for (const query of downQueries.reverse()) {
					await dataSource.query(query);
				}

				table = await queryRunner.getTable('metric');
				defaultOperator = table!.findColumnByName('defaultOperator');
				expect(defaultOperator!.enum!.sort()).to.deep.equal(
					['lt', 'le', 'eq', 'ne', 'ge', 'gt'].sort(),
				);
				expect(defaultOperator!.default).to.equal(`'eq'`);

				defaultOperator2 = table!.findColumnByName('defaultOperator2');
				expect(defaultOperator2!.default).to.be.undefined;

				defaultOperator3 = table!.findColumnByName('defaultOperator3');
				expect(defaultOperator3!.default).to.equal(`'eq'`);

				defaultOperator4 = table!.findColumnByName('defaultOperator4');
				expect(defaultOperator4!.default).to.equal(`'eq'`);

				await queryRunner.release();
				await dataSource.close();
			}),
		));
});
