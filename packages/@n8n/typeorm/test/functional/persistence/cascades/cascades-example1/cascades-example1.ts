import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { Profile } from './entity/Profile';
import { Photo } from './entity/Photo';
import { User } from './entity/User';

describe('persistence > cascades > example 1', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should insert everything by cascades properly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const photo = new Photo();
				photo.id = 1;
				const profile = new Profile();
				profile.id = 1;
				profile.photo = photo;

				const user = new User();
				user.id = 1;
				user.name = 'Umed';
				user.profile = profile;

				await connection.manager.save(user);

				const loadedUser = await connection.manager
					.createQueryBuilder(User, 'user')
					.leftJoinAndSelect('user.profile', 'profile')
					.leftJoinAndSelect('profile.photo', 'profilePhoto')
					.leftJoinAndSelect('profile.user', 'profileUser')
					.getOne();

				loadedUser!.should.be.eql({
					id: 1,
					name: 'Umed',
					profile: {
						id: 1,
						photo: {
							id: 1,
							name: 'My photo',
						},
						user: {
							id: 1,
							name: 'Umed',
						},
					},
				});
			}),
		));
});
