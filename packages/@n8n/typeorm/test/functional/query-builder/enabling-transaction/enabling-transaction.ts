import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('query builder > enabling transaction', () => {
	let connections: DataSource[];
	before(async () => (connections = await createTestingConnections({ __dirname })));
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should execute query in a transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.title = 'about transactions in query builder';

				await connection
					.createQueryBuilder()
					.insert()
					.into(Post)
					.values(post)
					.useTransaction(true)
					.execute();

				// todo: check if transaction query was executed
			}),
		));

	// todo: add tests for update and remove queries as well
});
