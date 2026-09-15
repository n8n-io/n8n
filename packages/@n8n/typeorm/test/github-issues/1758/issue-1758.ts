import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';

describe("github issues > #1758 Synchronization bug in PostgreSQL bug occurs when we explicitly state the default schema as 'public'", () => {
	describe('postgres, cockroachdb', () => {
		let connections: DataSource[];
		before(async () => {
			connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
				schema: 'public',
				schemaCreate: true,
				dropSchema: true,
			});
		});
		after(() => closeTestingConnections(connections));

		it("should correctly synchronize schema when we explicitly state the default schema as 'public'", () =>
			Promise.all(
				connections.map(async (connection) => {
					await connection.synchronize();
				}),
			));
	});
});
