import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { TeamEntity } from './entity/TeamEntity';
import { UserEntity } from './entity/UserEntity';

describe('other issues > redundant cascade schema queries in many-to-many relation', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [TeamEntity, UserEntity],
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.synchronize();
				console.log('------');
				await connection.synchronize();
			}),
		));
});
