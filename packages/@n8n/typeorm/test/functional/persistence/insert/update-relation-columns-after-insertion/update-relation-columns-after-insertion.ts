import 'reflect-metadata';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { DataSource } from '../../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';

describe('persistence > insert > update-relation-columns-after-insertion', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work perfectly', () =>
		Promise.all(
			connections.map(async (connection) => {
				// create category
				const category1 = new Category();
				category1.name = 'Category saved by cascades #1';
				await connection.manager.save(category1);

				// create post
				const post1 = new Post();
				post1.title = 'Hello Post #1';
				post1.category = category1;
				await connection.manager.save(post1);

				// todo: HERE FOR CALCULATIONS WE NEED TO CALCULATE OVERALL NUMBER OF QUERIES TO PREVENT EXTRA QUERIES
			}),
		));
});
