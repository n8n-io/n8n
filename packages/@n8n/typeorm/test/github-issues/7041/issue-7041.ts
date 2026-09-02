import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { expect } from 'chai';
import { Organization, Admin, User, OrganizationMembership } from './entity';

describe('github issues > #7041 When requesting nested relations on foreign key primary entities, relation becomes empty entity rather than null', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Organization, Admin, User, OrganizationMembership],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should return null when requested nested relations are empty on OneToOne relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepo = connection.getRepository(User);
				const testUser = new User();
				testUser.randomField = 'foo';
				await userRepo.save(testUser);
				const foundUser = await userRepo.findOne({
					where: {
						id: testUser.id,
					},
					relations: { admin: { organization: true } },
				});
				expect(foundUser?.randomField).eq('foo');
				expect(foundUser?.admin).eq(null);
			}),
		));

	it('should return [] when requested nested relations are empty on OneToMany relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepo = connection.getRepository(User);
				const testUser = new User();
				testUser.randomField = 'foo';
				await userRepo.save(testUser);
				const foundUser = await userRepo.findOne({
					where: {
						id: testUser.id,
					},
					relations: { membership: { organization: true } },
				});
				expect(foundUser?.randomField).eq('foo');
				expect(foundUser?.membership).eql([]);
			}),
		));
});
