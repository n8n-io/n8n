import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { UserEntity } from './entity/UserEntity';
import { expect } from 'chai';
import { DataSource } from '../../../src';

describe('github issues > #8450 Generated column not in RETURNING clause on save', () => {
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

	it('should populate an object with generated column values after saving', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user = new UserEntity();
				user.id = 100;

				expect(user.generated).to.be.undefined;

				await connection.manager.save(user);

				expect(user.generated).to.be.a('number');
				expect(user.generated).to.be.equal(user.id * 2);
			}),
		));
});
