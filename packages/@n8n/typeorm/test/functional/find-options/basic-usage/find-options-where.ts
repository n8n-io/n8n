import 'reflect-metadata';
import '../../../utils/test-setup';
import { DataSource, LessThan, MoreThan } from '../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Author } from './entity/Author';
import { Counters } from './entity/Counters';
import { Post } from './entity/Post';
import { Tag } from './entity/Tag';
import { prepareData } from './find-options-test-utils';

describe('find options > where', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				__dirname,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('where id', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							id: 1,
						},
					})
					.getMany();

				posts.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('where title', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							title: 'Post #2',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
				]);
			}),
		));

	it('where two criteria', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							title: 'Post #2',
							text: 'About post #2',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
				]);
			}),
		));

	it('where two criteria without match', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							title: 'Post #2',
							text: 'About post #3',
						},
					})
					.getMany();
				posts.should.be.eql([]);
			}),
		));

	it('where relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts1 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: {
								id: 1,
							},
						},
					})
					.getMany();
				posts1.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
						counters: { likes: 1 },
					},
				]);

				const posts2 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: {
								id: 2,
							},
						},
					})
					.getMany();
				posts2.should.be.eql([
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('where column and relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							title: 'Post #2',
							author: {
								id: 1,
							},
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
				]);
			}),
		));

	it('where nested relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: {
								photos: {
									filename: 'chain.jpg',
									description: 'Me and chain',
								},
							},
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('where complex nested relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: {
								photos: {
									filename: 'chain.jpg',
									description: 'Me and chain',
								},
							},
							tags: {
								name: 'category #1',
							},
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('where or + optional relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: [
							{
								author: {
									id: 1,
								},
							},
							{
								tags: {
									name: 'category #1',
								},
							},
						],
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
						counters: { likes: 1 },
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('where column in embed', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							counters: {
								likes: 1,
							},
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
						counters: { likes: 1 },
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('where relation in embed', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							counters: {
								likedUsers: {
									firstName: 'Gyro',
								},
							},
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('where complex with or + and', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: [
							{
								title: 'Post #2',
							},
							{
								counters: {
									likedUsers: [
										{
											firstName: 'Gyro',
											lastName: 'Copter',
										},
										{
											firstName: 'Timber',
											lastName: 'Saw',
										},
									],
								},
							},
						],
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
						counters: { likes: 1 },
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('where relations with operators', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts1 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							tags: MoreThan(1),
						},
					})
					.getMany();
				posts1.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
				]);

				const posts2 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							tags: MoreThan(0),
							counters: {
								likedUsers: MoreThan(1),
							},
						},
					})
					.getMany();
				posts2.should.be.eql([
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
				]);

				const posts3 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: {
								photos: MoreThan(1),
							},
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts3.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
						counters: { likes: 1 },
					},
				]);

				const authors = await connection
					.createQueryBuilder(Author, 'author')
					.setFindOptions({
						where: {
							photos: MoreThan(0),
						},
					})
					.getMany();
				authors.should.be.eql([{ id: 1, firstName: 'Timber', lastName: 'Saw', age: 25 }]);

				const tags1 = await connection
					.createQueryBuilder(Tag, 'tag')
					.setFindOptions({
						where: {
							posts: MoreThan(1),
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				tags1.should.be.eql([
					{ id: 1, name: 'category #1' },
					{ id: 2, name: 'category #2' },
				]);

				const tags2 = await connection
					.createQueryBuilder(Tag, 'tag')
					.setFindOptions({
						where: {
							posts: LessThan(1),
						},
					})
					.getMany();
				tags2.should.be.eql([{ id: 3, name: 'category #3' }]);
			}),
		));

	it('should not apply inner join if all conditions return undefined', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const post4 = new Post();
				post4.id = 4;
				post4.title = 'Post #4';
				post4.text = 'About post #4';
				post4.counters = new Counters();
				post4.counters.likes = 1;
				await connection.manager.save(post4);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: {
								id: undefined,
								firstName: undefined,
							},
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
						counters: { likes: 1 },
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
						counters: { likes: 1 },
					},
				]);
			}),
		));

	it('should apply inner join if true is applied', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const post4 = new Post();
				post4.id = 4;
				post4.title = 'Post #4';
				post4.text = 'About post #4';
				post4.counters = new Counters();
				post4.counters.likes = 1;
				await connection.manager.save(post4);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: true,
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						text: 'About post #1',
						counters: { likes: 1 },
					},
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
						counters: { likes: 2 },
					},
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
						counters: { likes: 1 },
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
						counters: { likes: 1 },
					},
				]);
			}),
		));
});
