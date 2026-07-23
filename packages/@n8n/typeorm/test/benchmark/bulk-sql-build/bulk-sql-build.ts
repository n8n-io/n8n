import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Post } from './entity/Post';

describe('benchmark > bulk-sql-build', () => {
	let dataSources: DataSource[];
	before(async () => {
		dataSources = await createTestingConnections({
			__dirname,
		});
	});
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	/**
	 * Before optimization (<0.3.12) execution time for 10.000 sqls was ~1.8s
	 * After optimization execution time for 10.000 sqls become ~0.380s
	 */

	it('testing bulk create of 10.000 sql with joins', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				for (let i = 0; i < 10_000; i++) {
					dataSource
						.getRepository(Post)
						.createQueryBuilder('post')
						.leftJoinAndSelect('post.categories', 'categories1')
						.leftJoinAndSelect('post.categories', 'categories2')
						.leftJoinAndSelect('post.categories', 'categories3')
						.leftJoinAndSelect('post.categories', 'categories4')
						.leftJoinAndSelect('post.categories', 'categories5')
						.leftJoinAndSelect('post.categories', 'categories6')
						.leftJoinAndSelect('post.categories', 'categories7')
						.where('post.id = 1')
						.getQuery();
				}
			}),
		));
});
