import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Realm } from './entity/User';
import { User } from './entity/User';

describe('github issues > #4630 Enum string not escaping resulting in broken migrations.', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should support enums of strings with apostrophes in them', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user = new User();
				user.realm = Realm.KelThuzad;

				await connection.manager.save(user);

				const users = await connection.manager.find(User);

				users.should.eql([
					{
						id: 1,
						realm: "Kel'Thuzad",
					},
				]);
			}),
		));
});
