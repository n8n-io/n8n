import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('github issues > #2809 afterUpdate subscriber entity argument is undefined', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				subscribers: [__dirname + '/subscriber/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('if entity has been updated via repository update(), subscriber should get passed entity to change', () =>
		Promise.all(
			connections.map(async function (connection) {
				let repo = connection.getRepository(Post);

				const insertPost = new Post();

				await repo.save(insertPost);

				const createdPost = await repo.findOneBy({ id: insertPost.id });
				expect(createdPost).not.to.be.null;

				const { id } = createdPost!;

				// test that the in memory post was touched by afterInsert PostSubscriber event
				expect(insertPost.title).to.equal('set in subscriber after created');

				const updatePost: Partial<Post> = { colToUpdate: 1 };
				// change the entity
				await repo.update(id, updatePost);

				// test that the in memory post was touched by afterUpdate PostSubscriber event
				expect(updatePost.title).to.equal('set in subscriber after updated');
			}),
		));
});
