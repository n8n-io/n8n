import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { User, Photo } from './entity/entities';

describe('github issues > #8690 Relations do not render primary key column values correctly when transformers present', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load relations correctly when primary columns have transformers', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepository = connection.getRepository(User);
				const photoRepository = connection.getRepository(Photo);
				const user = userRepository.create({ id: `"1"` });
				await userRepository.save(user);
				const photo = photoRepository.create({
					id: `"42"`,
					url: 'example.com/photo1',
					userId: user.id,
				});
				await photoRepository.save(photo);
				const userPhotos = await user.photos;
				expect(userPhotos.length === 1);
				expect(userPhotos[0].id === photo.id);
				expect(userPhotos[0].userId === user.id);
			}),
		));
});
