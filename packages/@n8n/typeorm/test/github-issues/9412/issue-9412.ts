import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';

describe('github issues > #9365 ', () => {
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

	it('should work with conflict path', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);

				const post1 = new Post();
				post1.title = 'Test1';
				post1.author = 'Test1';
				await postRepository.save(post1);

				const post2 = new Post();
				post2.title = 'Test';
				post2.author = 'Test2';

				await postRepository.upsert(post2, {
					conflictPaths: { author: true },
					skipUpdateIfNoValuesChanged: true,
				});
				const allPostsAfterUpsert1 = await postRepository.find();
				expect(allPostsAfterUpsert1.length).equal(2);

				await postRepository.upsert(post2, {
					conflictPaths: { title: true },
					skipUpdateIfNoValuesChanged: true,
				});
				const allPostsAfterUpsert2 = await postRepository.find();
				expect(allPostsAfterUpsert2.length).equal(2);
			}),
		));
});
