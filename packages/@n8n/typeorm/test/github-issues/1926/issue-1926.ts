import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

import { Role } from './entity/Role';
import { Event } from './entity/Event';
import { EventRole } from './entity/EventRole';

// todo: fix later (refactor persistence)
describe.skip('github issues > #1926 Update fails for entity with compound relation-based primary key on OneToMany relationship', () => {
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

	it('Should update OneToMany entity with compound relation-based primary key', () =>
		Promise.all(
			connections.map(async (connection) => {
				let role = new Role();
				role.title = 'The Boss';

				role = await connection.manager.save(role);

				let event = new Event();
				event.title = 'The Big Event';

				let eventRole = new EventRole();
				eventRole.description = 'Be the boss';
				eventRole.compensation = 'All the money!';
				eventRole.roleId = role.id;

				event.roles = [eventRole];

				event = await connection.manager.save(event);

				event.roles[0].description = 'Be a good boss';

				// Fails with:
				// QueryFailedError: duplicate key value violates unique constraint "PK_..."
				await connection.manager.save(event);
			}),
		));
});
