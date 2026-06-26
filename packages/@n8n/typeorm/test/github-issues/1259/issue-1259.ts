import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';

describe("github issues > #1259 Can't sort by fields added with addSelect", () => {
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

	it('should order by added selects when pagination is used', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categories = [new Category(), new Category()];
				await connection.manager.save(categories);

				const posts: Post[] = [];
				for (let i = 0; i < 10; i++) {
					const post = new Post();
					if (i > 5 && i < 8) {
						post.name = `timber`;
					} else {
						post.name = `Tim${i}ber`;
					}
					post.count = 2;
					post.categories = categories;
					posts.push(post);
				}
				await connection.manager.save(posts);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.addSelect('ts_rank_cd(to_tsvector(post.name), to_tsquery(:query))', 'rank')
					.leftJoinAndSelect('post.categories', 'categories')
					.orderBy('rank', 'DESC')
					// .addOrderBy("post.id")
					.take(5)
					.setParameter('query', 'timber')
					.getMany();

				loadedPosts.length.should.be.equal(5);
				loadedPosts[0].id.should.be.equal(7);
				loadedPosts[0].name.should.be.equal('timber');
				loadedPosts[1].id.should.be.equal(8);
				loadedPosts[1].name.should.be.equal('timber');
			}),
		));

	it('should order by added selects when pagination is used', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categories = [new Category(), new Category()];
				await connection.manager.save(categories);

				const posts: Post[] = [];
				for (let i = 0; i < 10; i++) {
					const post = new Post();
					post.name = `timber`;
					post.count = i * -1;
					post.categories = categories;
					posts.push(post);
				}
				await connection.manager.save(posts);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.addSelect('post.count * 2', 'doublecount')
					.leftJoinAndSelect('post.categories', 'categories')
					.orderBy('doublecount')
					.take(5)
					.getMany();

				loadedPosts.length.should.be.equal(5);
				loadedPosts[0].id.should.be.equal(10);
				loadedPosts[1].id.should.be.equal(9);
				loadedPosts[2].id.should.be.equal(8);
				loadedPosts[3].id.should.be.equal(7);
				loadedPosts[4].id.should.be.equal(6);
			}),
		));
});
