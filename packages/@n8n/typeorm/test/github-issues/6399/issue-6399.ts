import { DataSource } from '../../../src';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Post, TargetPost } from './entity/Post';
import { Comment } from './entity/Comment';

describe('github issues > #6399 Process extraAppendedAndWhereCondition for inherited entity', () => {
	let connections: DataSource[];

	before(async () => {
		return (connections = await createTestingConnections({
			entities: [Post, TargetPost, Comment],
			schemaCreate: true,
			dropSchema: true,
			enabledDrivers: ['postgres'],
		}));
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('Query with join and limit for inhered entity', () =>
		Promise.all(
			connections.map(async (connection) => {
				const targetPostRepo = connection.getRepository(TargetPost);

				const posts: TargetPost[] = [
					{
						id: 1,
						title: 'Post 1',
						postType: 'TargetPost',
					},
					{ id: 2, title: 'Post 2', postType: 'TargetPost' },
					{
						id: 3,
						title: 'Post 3',
						postType: 'TargetPost',
					},
				];

				await targetPostRepo.save(posts);

				const result = await targetPostRepo
					.createQueryBuilder('targetPosts')
					.leftJoinAndSelect('targetPosts.comments', 'comments')
					.take(2)
					.getMany();

				expect(result.length).eq(2);
			}),
		));
});
