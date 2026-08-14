import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { TableColumn } from '../../../src/schema-builder/table/TableColumn';
import { Table } from '../../../src/schema-builder/table/Table';

describe('github issues > #2259 Missing type for generated columns', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('Should create table with generated column', () =>
		Promise.all(
			connections.map(async (connection) => {
				const id = new TableColumn({
					name: 'id',
					type: 'uuid',
					generationStrategy: 'uuid',
					isGenerated: true,
					isPrimary: true,
				});
				const client = new Table({
					name: 'table',
					columns: [id],
				});
				await connection.createQueryRunner().createTable(client);
			}),
		));
});
