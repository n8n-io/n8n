import '../../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { expect } from 'chai';
import { DataSource } from '../../../../src';
import { User } from './entity/User';

describe('query builder > isolated-where', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [User],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
				isolateWhereStatements: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly apply brackets when where statement isolation is enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager
					.createQueryBuilder(User, 'user')
					.where('user.id = :userId', { userId: 'user-id' })
					.andWhere('user.firstName = :search OR user.lastName = :search', {
						search: 'search-term',
					})
					.disableEscaping()
					.getSql();

				expect(sql).to.be.equal(
					'SELECT user.id AS user_id, user.firstName AS user_firstName, ' +
						'user.lastName AS user_lastName, user.isAdmin AS user_isAdmin ' +
						'FROM user user ' +
						'WHERE user.id = ? ' +
						'AND (user.firstName = ? OR user.lastName = ?)',
				);
			}),
		));
});
