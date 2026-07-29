import 'reflect-metadata';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Role, User } from './entity/UserEntity';

describe('github issues > #5275 Enums with spaces are not converted properly.', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [User],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly parse enums of strings with spaces', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepository = connection.getRepository(User);
				await userRepository.save({
					id: 1,
					roles: [
						Role.GuildMaster,
						Role.Officer,
						Role.Boss,
						Role.Warrior,
						Role.Number,
						Role.PlayerAlt,
					],
				});
				const user = await userRepository.findOneByOrFail({ id: 1 });
				user.roles.should.deep.equal([
					'Guild Master',
					'Officer',
					'BOSS "LEVEL 80"',
					'Knight\\Rogue',
					1,
					'Player Alt',
				]);
			}),
		));

	it('should correctly parse non-array enums with spaces', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepository = connection.getRepository(User);
				await userRepository.save([
					{ id: 1 },
					{ id: 2, role: Role.Boss },
					{ id: 3, role: Role.Warrior },
				]);

				const user1 = await userRepository.findOneByOrFail({ id: 1 });
				user1.role.should.equal('Guild Master');

				const user2 = await userRepository.findOneByOrFail({ id: 2 });
				user2.role.should.equal('BOSS "LEVEL 80"');

				const user3 = await userRepository.findOneByOrFail({ id: 3 });
				user3.role.should.equal('Knight\\Rogue');
			}),
		));
});
