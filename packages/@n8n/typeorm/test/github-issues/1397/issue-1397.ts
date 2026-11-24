import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Post } from './entity/Post';

describe('github issue > #1397 Spaces at the end of values are removed when inserting', () => {
	let connections: DataSource[] = [];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not trim empty spaces when saving', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.title = ' About My Post   ';
				await connection.manager.save(post);
				post.title.should.be.equal(' About My Post   ');

				const loadedPost = await connection.manager.findOneBy(Post, {
					id: 1,
				});
				expect(loadedPost).not.to.be.null;
				loadedPost!.title.should.be.equal(' About My Post   ');
			}),
		));
});
