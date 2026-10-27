import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Category } from './entity/Category';
import { User } from './entity/User';
import { Post } from './entity/Post';

describe('query builder > distinct on', () => {
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

	async function prepareData(connection: DataSource) {
		const users = [
			{
				name: 'Dion',
			},
			{
				name: 'Zelda',
			},
			{
				name: 'Sarah',
			},
			{
				name: 'Pablo',
			},
		];
		await connection.createQueryBuilder().insert().into(User).values(users).execute();

		const categories = [
			{
				title: 'Category One',
				author: 'Dion',
			},
			{
				title: 'Category Two',
				author: 'Dion',
			},
			{
				title: 'Category Three',
				author: 'Zelda',
			},
			{
				title: 'Category Four',
				author: 'Zelda',
			},
			{
				title: 'Category Five',
				author: 'Dion',
			},
		];
		await connection.createQueryBuilder().insert().into(Category).values(categories).execute();

		const posts = [
			{
				title: 'Post One',
				author: 'Dion',
				moderator: 'Dion',
			},
			{
				title: 'Post Two',
				author: 'Sarah',
				moderator: 'Dion',
			},
			{
				title: 'Post Three',
				author: 'Zelda',
				moderator: 'Dion',
			},
			{
				title: 'Post Four',
				author: 'Sarah',
				moderator: 'Dion',
			},
			{
				title: 'Post Five',
				author: 'Pablo',
				moderator: 'Sarah',
			},
		];
		await connection.createQueryBuilder().insert().into(Post).values(posts).execute();
	}

	it('should perform distinct on category authors', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection);

				const result = await connection.manager
					.createQueryBuilder(Category, 'category')
					.distinctOn(['category.author'])
					.getMany();

				expect(result.map(({ author }) => author)).to.have.members(['Dion', 'Zelda']);
			}),
		));

	it('should perform distinct on post authors and moderators combination', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection);

				const result = await connection.manager
					.createQueryBuilder(Post, 'post')
					.distinctOn(['post.author', 'post.moderator'])
					.getMany();

				expect(result.map(({ moderator }) => moderator)).to.have.members([
					'Dion',
					'Sarah',
					'Dion',
					'Dion',
				]) &&
					expect(result.map(({ author }) => author)).to.have.members([
						'Dion',
						'Pablo',
						'Sarah',
						'Zelda',
					]);
			}),
		));

	it('should perform distinct on post and category authors', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection);

				const result = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect(Category, 'category', 'category.author = post.author')
					.distinctOn(['post.author', 'category.author'])
					.getMany();

				expect(result.map(({ author }) => author)).to.have.members([
					'Dion',
					'Pablo',
					'Sarah',
					'Zelda',
				]);
			}),
		));
});
