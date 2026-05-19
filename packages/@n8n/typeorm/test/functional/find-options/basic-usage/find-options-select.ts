import 'reflect-metadata';
import '../../../utils/test-setup';
import { DataSource } from '../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Post } from './entity/Post';
import { prepareData } from './find-options-test-utils';

describe('find options > select', () => {
	let connections: DataSource[];
	before(async () => (connections = await createTestingConnections({ __dirname })));
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('select id', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts1 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						select: { id: true },
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts1.should.be.eql([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);

				const posts2 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						select: {
							id: true,
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts2.should.be.eql([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
			}),
		));

	it('select title', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts1 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						select: { title: true },
						order: {
							title: 'asc',
						},
					})
					.getMany();
				posts1.should.be.eql([
					{ title: 'Post #1' },
					{ title: 'Post #2' },
					{ title: 'Post #3' },
					{ title: 'Post #4' },
				]);

				const posts2 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						select: {
							title: true,
						},
						order: {
							title: 'asc',
						},
					})
					.getMany();
				posts2.should.be.eql([
					{ title: 'Post #1' },
					{ title: 'Post #2' },
					{ title: 'Post #3' },
					{ title: 'Post #4' },
				]);
			}),
		));

	it('select title and text', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts1 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						select: { title: true, text: true },
						order: {
							title: 'asc',
						},
					})
					.getMany();
				posts1.should.be.eql([
					{ title: 'Post #1', text: 'About post #1' },
					{ title: 'Post #2', text: 'About post #2' },
					{ title: 'Post #3', text: 'About post #3' },
					{ title: 'Post #4', text: 'About post #4' },
				]);

				const posts2 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						select: {
							title: true,
							text: true,
						},
						order: {
							title: 'asc',
						},
					})
					.getMany();
				posts2.should.be.eql([
					{ title: 'Post #1', text: 'About post #1' },
					{ title: 'Post #2', text: 'About post #2' },
					{ title: 'Post #3', text: 'About post #3' },
					{ title: 'Post #4', text: 'About post #4' },
				]);
			}),
		));

	it('select column in embed', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						select: {
							counters: {
								likes: true,
							},
						},
						order: {
							id: 'asc',
						},
					})
					.getMany();
				posts.should.be.eql([
					{ counters: { likes: 1 } },
					{ counters: { likes: 2 } },
					{ counters: { likes: 1 } },
					{ counters: { likes: 1 } },
				]);
			}),
		));
});
