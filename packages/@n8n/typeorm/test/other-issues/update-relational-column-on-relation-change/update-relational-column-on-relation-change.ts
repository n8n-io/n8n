import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';

describe('other issues > update relational column on relation change', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should update relational column when relation is inserted', () =>
		Promise.all(
			connections.map(async function (connection) {
				const category1 = new Category();
				category1.name = 'category #1';

				const category2 = new Category();
				category2.name = 'category #1';

				const post = new Post();
				post.title = 'about categories';
				post.categories = [category1, category2];
				await connection.manager.save(post);

				category1.postId.should.be.equal(1);
				category2.postId.should.be.equal(1);

				const post2 = new Post();
				post2.title = 'post #2';
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #2';
				await connection.manager.save(post3);

				category1.post = post2;
				category2.post = post3;
				await connection.manager.save([category1, category2]);

				category1.postId.should.be.equal(2);
				category2.postId.should.be.equal(3);
			}),
		));
});
