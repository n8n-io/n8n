import 'reflect-metadata';
import '../../utils/test-setup';
import { DataSource, In, IsNull } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Post } from './entity/Post';
import { User } from './entity/User';
import { prepareDataManyToOne, prepareDataOneToOne } from './issue-8890-utils';

describe('github issues > #8890 it should be possible to query IS NULL on ManyToOne relations', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				__dirname,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('where IsNull', () =>
		Promise.all(
			dataSources.map(async (connection) => {
				await prepareDataManyToOne(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: IsNull(),
						},
					})
					.orderBy('post.id', 'ASC')
					.getMany();

				posts.should.be.eql([
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
					},
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
					},
				]);
			}),
		));

	it('where In', () =>
		Promise.all(
			dataSources.map(async (connection) => {
				await prepareDataManyToOne(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							author: In([2, 3]),
						},
					})
					.orderBy('post.id', 'ASC')
					.getMany();

				posts.should.be.eql([
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
					},
					{
						id: 5,
						title: 'Post #5',
						text: 'About post #5',
					},
				]);
			}),
		));

	it('where IsNull OR In', () =>
		Promise.all(
			dataSources.map(async (connection) => {
				await prepareDataManyToOne(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: [
							{
								author: In([2, 3]),
							},
							{
								author: IsNull(),
							},
						],
					})
					.orderBy('post.id', 'ASC')
					.getMany();

				posts.should.be.eql([
					{
						id: 2,
						title: 'Post #2',
						text: 'About post #2',
					},
					{
						id: 3,
						title: 'Post #3',
						text: 'About post #3',
					},
					{
						id: 4,
						title: 'Post #4',
						text: 'About post #4',
					},
					{
						id: 5,
						title: 'Post #5',
						text: 'About post #5',
					},
				]);
			}),
		));
});

describe('github issues > #8890 it should be possible to query IS NULL on OneToOne relations on owner side', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				__dirname,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('where IsNull', () =>
		Promise.all(
			dataSources.map(async (connection) => {
				await prepareDataOneToOne(connection.manager);

				const users = await connection
					.createQueryBuilder(User, 'user')
					.setFindOptions({
						where: {
							profile: IsNull(),
						},
					})
					.orderBy('user.id', 'ASC')
					.getMany();

				users.should.be.eql([
					{
						id: 4,
						username: 'user #4',
					},
				]);
			}),
		));

	it('where In', () =>
		Promise.all(
			dataSources.map(async (connection) => {
				await prepareDataOneToOne(connection.manager);

				const users = await connection
					.createQueryBuilder(User, 'user')
					.setFindOptions({
						where: {
							profile: In([1, 2]),
						},
					})
					.orderBy('user.id', 'ASC')
					.getMany();

				users.should.be.eql([
					{
						id: 1,
						username: 'user #1',
					},
					{
						id: 2,
						username: 'user #2',
					},
				]);
			}),
		));

	it('where IsNull OR In', () =>
		Promise.all(
			dataSources.map(async (connection) => {
				await prepareDataOneToOne(connection.manager);

				const users = await connection
					.createQueryBuilder(User, 'user')
					.setFindOptions({
						where: [
							{
								profile: In([1, 2]),
							},
							{
								profile: IsNull(),
							},
						],
					})
					.orderBy('user.id', 'ASC')
					.getMany();

				users.should.be.eql([
					{
						id: 1,
						username: 'user #1',
					},
					{
						id: 2,
						username: 'user #2',
					},
					{
						id: 4,
						username: 'user #4',
					},
				]);
			}),
		));
});
