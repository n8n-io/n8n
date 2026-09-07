import 'reflect-metadata';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
// import {expect} from "chai";

describe('persistence > remove-topological-order', function () {
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

	it('should remove depend properties in a proper order', () =>
		Promise.all(
			connections.map(async (connection) => {
				// insert some data
				const category1 = new Category();
				category1.name = 'cat#1';

				const category2 = new Category();
				category2.name = 'cat#2';

				const post = new Post();
				post.title = 'about post';
				post.categories = [category1, category2];

				// check insertion
				await connection.manager.save(post);

				// check deletion
				await connection.manager.remove([category2, post, category1]);

				// todo: finish test, e.g. check actual queries
			}),
		));
});
