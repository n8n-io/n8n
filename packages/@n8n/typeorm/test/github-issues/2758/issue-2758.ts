import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { Person } from './entity/Person';
import { User } from './entity/User';

describe.skip("github issues > #2758 Insert fails when related OneToOne entity's primary key is also a foreign key", () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('should insert person with nested new party', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repository = connection.getRepository(Person);
				await connection.manager.save(
					repository.create({
						party: {},
					}),
				);
			}),
		));

	it('should insert user with nested new person', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repository = connection.getRepository(User);
				await connection.manager.save(
					repository.create({
						person: { party: {} },
					}),
				);
			}),
		));

	it('should insert a new user with existing person', () =>
		Promise.all(
			connections.map(async (connection) => {
				const personRepository = connection.getRepository(Person);
				const person = await connection.manager.save(
					personRepository.create({
						party: {},
					}),
				);

				const userRepository = connection.getRepository(User);
				await connection.manager.save(
					userRepository.create({
						person: person,
					}),
				);
			}),
		));

	it('should insert user with existing personId', () =>
		Promise.all(
			connections.map(async (connection) => {
				const personRepository = connection.getRepository(Person);
				const person = await connection.manager.save(
					personRepository.create({
						party: {},
					}),
				);

				const userRepository = connection.getRepository(User);
				await connection.manager.save(
					userRepository.create({
						personId: person.id,
					}),
				);
			}),
		));
});
