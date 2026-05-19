import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('github issues > #1118 findByIds must return empty results if no criteria were passed in an array', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('drivers which does not support offset without limit should throw an exception, other drivers must work fine', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.name = 'post #1';
				await connection.manager.save(post);

				await connection.manager.findByIds(Post, [1]).should.eventually.eql([
					{
						id: 1,
						name: 'post #1',
					},
				]);

				await connection.manager.findByIds(Post, []).should.eventually.eql([]);
			}),
		));
});
