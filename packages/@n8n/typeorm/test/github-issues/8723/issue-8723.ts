import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Connection } from '../../../src/connection/Connection';
import { User } from './entity/User';
import { Photo } from './entity/Photo';

describe('github issues > #8723 Fail on Update when reference exists together with FK: multiple assignments to same column ', () => {
	let connections: Connection[];
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

	it('should able to update when both reference and the id exist in the update object', () =>
		Promise.all(
			connections.map(async (connection) => {
				const photoRepository = connection.getRepository(Photo);
				const userRepository = connection.getRepository(User);

				const user = await userRepository.save({ id: 1, name: 'Test' });
				const photo = await photoRepository.save({ id: 1 });

				await photoRepository.update({ id: photo.id }, { user, userId: user.id });
			}),
		));
});
