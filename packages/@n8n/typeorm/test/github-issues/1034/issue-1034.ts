import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';
import { Circle } from './entity/Circle';
import { expect } from 'chai';

describe('github issues > #1034 Issue using setter with promises', () => {
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

	it('should set members in circle', () =>
		Promise.all(
			connections.map(async (connection) => {
				const users: User[] = [];

				const user: User = new User();
				user.setId('1');

				const circle: Circle = new Circle();
				circle.setId('1');

				// Entities persistance
				await connection.manager.save(user);
				await connection.manager.save(circle);

				users.push(user);
				const circleFromDB = await connection.manager.findOneById(Circle, circle.getId());
				expect(circleFromDB).is.not.null;

				// Setting users with setter
				circleFromDB!.setUsers(Promise.resolve(users));
				await Promise.resolve(); // this is unpleasant way to fix this issue
				expect(users).deep.equal(await circleFromDB!.getUsers());
			}),
		));
});
