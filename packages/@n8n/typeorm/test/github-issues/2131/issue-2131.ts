import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Post } from './entity/Post';

describe('github issues > #2131 InsertResult return the same primary key', () => {
	let connections: DataSource[];
	const posts: Post[] = [
		{
			id: null,
			title: 'Post 1',
		},
		{
			id: null,
			title: 'Post 2',
		},
		{
			id: null,
			title: 'Post 3',
		},
		{
			id: null,
			title: 'Post 4',
		},
	];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should get correct insert ids for multiple entities inserted', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.createQueryBuilder().insert().into(Post).values(posts).execute();

				expect(posts[0].id).to.equal(1);
				expect(posts[1].id).to.equal(2);
				expect(posts[2].id).to.equal(3);
				expect(posts[3].id).to.equal(4);
			}),
		));
});
