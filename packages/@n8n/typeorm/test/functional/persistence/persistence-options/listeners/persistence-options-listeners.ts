import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { Post } from './entity/Post';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { PostWithDeleteDateColumn } from './entity/PostWithDeleteDateColumn';

describe('persistence > persistence options > listeners', () => {
	// -------------------------------------------------------------------------
	// Configuration
	// -------------------------------------------------------------------------

	let connections: DataSource[];
	before(async () => (connections = await createTestingConnections({ __dirname })));
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	it('save listeners should work by default', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.id = 1;
				post.title = 'Bakhrom';
				post.description = 'Hello';
				await connection.manager.save(post);
				post.title.should.be.equal('Bakhrom!');
			}),
		));

	it('save listeners should be disabled if save option is specified', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.id = 1;
				post.title = 'Bakhrom';
				post.description = 'Hello';
				await connection.manager.save(post, { listeners: false });
				post.title.should.be.equal('Bakhrom');
			}),
		));

	it('remove listeners should work by default', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.id = 1;
				post.title = 'Bakhrom';
				post.description = 'Hello';
				await connection.manager.save(post);
				await connection.manager.remove(post);
				post.isRemoved.should.be.equal(true);
			}),
		));

	it('remove listeners should be disabled if remove option is specified', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.id = 1;
				post.title = 'Bakhrom';
				post.description = 'Hello';
				await connection.manager.save(post);
				await connection.manager.remove(post, { listeners: false });
				post.isRemoved.should.be.equal(false);
			}),
		));

	it('soft-remove listeners should work by default', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithDeleteDateColumn();
				post.title = 'Bakhrom';
				post.description = 'Hello';
				await connection.manager.save(post);
				await connection.manager.softRemove(post);
				post.title.should.be.equal('Bakhrom!');
				post.isSoftRemoved.should.be.equal(true);
			}),
		));

	it('soft-remove listeners should be disabled if remove option is specified', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithDeleteDateColumn();
				post.title = 'Bakhrom';
				post.description = 'Hello';
				await connection.manager.save(post);
				await connection.manager.softRemove(post, { listeners: false });
				post.title.should.be.equal('Bakhrom');
				post.isSoftRemoved.should.be.equal(false);
			}),
		));
});
