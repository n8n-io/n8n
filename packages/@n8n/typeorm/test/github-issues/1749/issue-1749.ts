import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Bar } from './entity/Bar';

describe("github issues > #1749 Can't delete tables in non-default schema", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should delete entites from tables in different schemas', () =>
		Promise.all(
			connections.map(async (connection) => {
				const bar = new Bar();
				const persistedBar = await connection.manager.save(bar);

				await connection.manager.delete(Bar, persistedBar.id);
			}),
		));
});
