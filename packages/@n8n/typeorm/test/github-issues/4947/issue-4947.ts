import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('github issues > #4947 beforeUpdate subscriber entity argument is undefined', () => {
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

				const newPost = new Post();
				await repo.save(newPost);

				const createdPost = await repo.findOne({
					where: {
						id: newPost.id,
					},
				});

				// test that the newly inserted post was touched by beforeInsert PostSubscriber event
				expect(createdPost).not.to.be.null;
				expect(createdPost!.title).to.equal('set in subscriber when created');

				// change the entity
				await repo.update(createdPost!.id, { colToUpdate: 1 });

				const updatedPost = await repo.findOne({
					where: {
						id: createdPost!.id,
					},
				});

				// test that the updated post was touched by beforeUpdate PostSubscriber event
				expect(updatedPost).not.to.be.null;
				expect(updatedPost!.title).to.equal('set in subscriber when updated');
			}),
		));
});
