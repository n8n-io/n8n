import 'reflect-metadata';
import '../../utils/test-setup';
import { DataSource, LessThanOrEqual, MoreThanOrEqual } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Author } from './entity/Author';
import { Post } from './entity/Post';
import { Tag } from './entity/Tag';
import { prepareData } from './find-options-test-utils';

describe('github issues > #9977', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				__dirname,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('where relations with (More|Less)ThanOrEqual operators', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const posts1 = await connection
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							tags: MoreThanOrEqual(2),
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
							tags: MoreThanOrEqual(1),
							counters: {
								likedUsers: MoreThanOrEqual(2),
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
								photos: MoreThanOrEqual(2),
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
							photos: MoreThanOrEqual(1),
						},
					})
					.getMany();
				authors.should.be.eql([{ id: 1, firstName: 'Timber', lastName: 'Saw', age: 25 }]);

				const tags1 = await connection
					.createQueryBuilder(Tag, 'tag')
					.setFindOptions({
						where: {
							posts: MoreThanOrEqual(2),
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
							posts: LessThanOrEqual(0),
						},
					})
					.getMany();
				tags2.should.be.eql([{ id: 3, name: 'category #3' }]);
			}),
		));
});
