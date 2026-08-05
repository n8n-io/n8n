import '../../utils/test-setup';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Connection } from '../../../src/connection/Connection';
import { expect } from 'chai';
import { User } from '../8796/entity/User';

describe('github issues > #8796 New find select object api should support false values as expected', () => {
	let connections: Connection[];

	const user: User = {
		id: 1,
		firstName: 'Christian',
		lastName: 'Fleury',
		github: 'chfleury',
	};

	const expectedUser: Partial<User> = {
		id: 1,
		firstName: 'Christian',
	};

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

	it('should suport false value when selecting fields', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepository = connection.getRepository(User);

				await userRepository.save(user);

				const foundUser = await userRepository.find({
					where: { id: 1 },
					select: {
						id: true,
						firstName: true,
						lastName: undefined,
						github: false,
					},
				});

				expect(foundUser[0]).to.deep.equal(expectedUser);
			}),
		));
});
