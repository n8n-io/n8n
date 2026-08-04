import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('github issues > #512 Table name escaping in UPDATE in QueryBuilder', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it("should escape table name using driver's escape function in UPDATE", () =>
		Promise.all(
			connections.map(async (connection) => {
				const driver = connection.driver;
				const queryBuilder = connection.manager.createQueryBuilder(Post, 'post');
				const query = queryBuilder
					.update({
						title: 'Some Title',
					})
					.getSql();

				return query.should.deep.include(driver.escape('Posts'));
			}),
		));
});
