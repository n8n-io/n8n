import 'reflect-metadata';
import '../../../utils/test-setup';
import { DataSource } from '../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Post, WithType } from './entity/Post';

describe('find options > opaque-types-over-primitives', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				__dirname,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	async function prepareData(dataSource: DataSource) {
		const post1 = new Post();
		post1.id = 1 as WithType<number>;
		post1.title = 'Hello' as WithType<string>;
		post1.isEdited = true as WithType<boolean>;
		await dataSource.manager.save(post1);
	}

	it('should work in select', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await prepareData(dataSource);

				const posts1 = await dataSource
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						select: {
							id: true,
							title: true,
							isEdited: true,
						},
					})
					.getMany();

				posts1.should.be.eql([{ id: 1, title: 'Hello', isEdited: true }]);
			}),
		));

	it('should work in where', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await prepareData(dataSource);

				const posts = await dataSource
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						where: {
							id: 1 as WithType<number>,
						},
					})
					.getMany();

				posts.should.be.eql([
					{
						id: 1,
						title: 'Hello',
						isEdited: true,
					},
				]);
			}),
		));

	it('should work in order by', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await prepareData(dataSource);

				const posts1 = await dataSource
					.createQueryBuilder(Post, 'post')
					.setFindOptions({
						order: {
							id: 'asc',
							title: 'asc',
							isEdited: 'asc',
						},
					})
					.getMany();
				posts1.should.be.eql([
					{
						id: 1,
						title: 'Hello',
						isEdited: true,
					},
				]);
			}),
		));
});
