import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource, UpdateValuesMissingError } from '../../../src/';
import { expect } from 'chai';
import { Post } from './entity/Post';

describe('github issues > #8393 When trying to update `update: false` column with `@UpdateDateColumn` the update column is updated', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not update the @UpdateDateColumn column when trying to update un-updatable column', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.title = 'Control flow based type analysis';
				post.readOnlyColumn = 1;

				await connection.manager.save(post);

				const updateResultPromise = connection.manager.update(Post, post.id, {
					// Make a change to read only column
					readOnlyColumn: 2,
				});

				await expect(updateResultPromise).to.be.rejectedWith(UpdateValuesMissingError);

				const updatedPost = await connection.manager.findOne(Post, {
					where: {
						id: post.id,
					},
				});

				expect(updatedPost).to.be.an('object');

				expect(post.readOnlyColumn).to.be.equal(updatedPost!.readOnlyColumn);

				// Gonna be false
				expect(post.lastUpdated.toString()).to.be.eql(updatedPost!.lastUpdated.toString());
			}),
		));
});
