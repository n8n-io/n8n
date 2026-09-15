import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Post, User } from './entities';

describe('github issues > #7079 Error when sorting by an embedded entity while using join and skip/take', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Post, User],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should be able to getMany with join and sorting by an embedded entity column while user take and skip', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepo = connection.getRepository(Post);
				const userRepo = connection.getRepository(User);

				const users = [
					{ id: 1, name: 'Mike' },
					{ id: 2, name: 'Alice' },
				];
				await userRepo.save(users);

				const posts = [
					{
						id: 1,
						text: 'Happy Holidays',
						userId: 1,
						blog: { date: new Date() },
						newsletter: { date: new Date() },
					},
					{
						id: 2,
						text: 'My Vacation',
						userId: 1,
						blog: { date: new Date() },
						newsletter: { date: new Date() },
					},
					{
						id: 3,
						text: 'Working with TypeORM',
						userId: 2,
						blog: { date: new Date() },
						newsletter: { date: new Date() },
					},
				];
				await postRepo.save(posts);

				const result = await postRepo
					.createQueryBuilder('post')
					.leftJoinAndSelect('post.user', 'user')
					.orderBy('post.blog.date')
					.take(2)
					.skip(1)
					.getMany();
				expect(result.length).eq(2);
			}),
		));
});
