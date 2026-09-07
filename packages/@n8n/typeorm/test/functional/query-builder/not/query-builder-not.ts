import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { User } from './entity/User';
import { NotBrackets } from '../../../../src/query-builder/NotBrackets';

describe('query builder > not', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should put negation in the SQL with one condition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.andWhere(
						new NotBrackets((qb) => {
							qb.where('user.firstName = :firstName1', {
								firstName1: 'Hello',
							});
						}),
					)
					.disableEscaping()
					.getSql();

				expect(sql).to.be.equal(
					'SELECT user.id AS user_id, user.firstName AS user_firstName, ' +
						'user.lastName AS user_lastName, user.isAdmin AS user_isAdmin ' +
						'FROM user user ' +
						'WHERE user.isAdmin = ? ' +
						'AND NOT(user.firstName = ?)',
				);
			}),
		));

	it('should put negation in the SQL with two condition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.andWhere(
						new NotBrackets((qb) => {
							qb.where('user.firstName = :firstName1', {
								firstName1: 'Hello',
							}).andWhere('user.lastName = :lastName1', {
								lastName1: 'Mars',
							});
						}),
					)
					.disableEscaping()
					.getSql();

				expect(sql).to.be.equal(
					'SELECT user.id AS user_id, user.firstName AS user_firstName, ' +
						'user.lastName AS user_lastName, user.isAdmin AS user_isAdmin ' +
						'FROM user user ' +
						'WHERE user.isAdmin = ? ' +
						'AND NOT((user.firstName = ? AND user.lastName = ?))',
				);
			}),
		));

	it('should put negation correctly into WHERE expression with one condition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User();
				user1.firstName = 'Timber';
				user1.lastName = 'Saw';
				user1.isAdmin = false;
				await connection.manager.save(user1);

				const user2 = new User();
				user2.firstName = 'Alex';
				user2.lastName = 'Messer';
				user2.isAdmin = false;
				await connection.manager.save(user2);

				const user3 = new User();
				user3.firstName = 'Umed';
				user3.lastName = 'Pleerock';
				user3.isAdmin = true;
				await connection.manager.save(user3);

				const users = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.andWhere(
						new NotBrackets((qb) => {
							qb.where('user.firstName = :firstName1', {
								firstName1: 'Timber',
							});
						}),
					)
					.getMany();

				expect(users.length).to.be.equal(1);
			}),
		));

	it('should put negation correctly into WHERE expression with two conditions', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User();
				user1.firstName = 'Timber';
				user1.lastName = 'Saw';
				user1.isAdmin = false;
				await connection.manager.save(user1);

				const user2 = new User();
				user2.firstName = 'Alex';
				user2.lastName = 'Messer';
				user2.isAdmin = false;
				await connection.manager.save(user2);

				const user3 = new User();
				user3.firstName = 'Umed';
				user3.lastName = 'Pleerock';
				user3.isAdmin = true;
				await connection.manager.save(user3);

				const users = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.andWhere(
						new NotBrackets((qb) => {
							qb.where('user.firstName = :firstName1', {
								firstName1: 'Timber',
							}).andWhere('user.lastName = :lastName1', {
								lastName1: 'Saw',
							});
						}),
					)
					.getMany();

				expect(users.length).to.be.equal(1);
			}),
		));
});
