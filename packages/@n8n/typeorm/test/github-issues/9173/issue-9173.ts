import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource, Table } from '../../../src';
import { View } from '../../../src/schema-builder/view/View';
import { expect } from 'chai';

describe('github issues > #9173 missing typeorm_metadata', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['sqlite', 'sqlite-pooled', 'postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should create a view without view entity', async () => {
		for (const connection of connections) {
			await connection.runMigrations({
				transaction: 'all',
			});
			await connection.createQueryRunner().createTable(
				new Table({
					name: 'test_table',
					columns: [
						{
							name: 'id',
							type: 'integer',
							isGenerated: true,
							isPrimary: true,
							generationStrategy: 'increment',
						},
						{
							name: 'name',
							type: 'text',
						},
					],
				}),
			);

			// create a test view
			await connection.createQueryRunner().createView(
				new View({
					name: 'test_view',
					expression: 'SELECT * FROM test_table',
				}),
			);

			const view = await connection.query('SELECT * FROM test_view');
			expect(view).to.be.exist;
		}
	});
});
