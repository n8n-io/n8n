import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Post } from './entity/Post';

describe('github issues > #2128 skip preparePersistentValue for value functions', () => {
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

	it('should be able to resolve value functions', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection
					.createQueryBuilder()
					.insert()
					.into(Post)
					.values({
						title: 'First Post',
						meta: {
							keywords: ['important', 'fresh'],
						},
					})
					.execute();

				const metaAddition = JSON.stringify({
					author: 'John Doe',
				});

				await connection
					.createQueryBuilder()
					.update(Post)
					.set({
						meta: () =>
							connection.driver.options.type === 'postgres'
								? `'${metaAddition}'::JSONB || meta::JSONB`
								: `JSON_MERGE('${metaAddition}', meta)`,
					})
					.where('title = :title', {
						title: 'First Post',
					})
					.execute();

				const loadedPost = await connection.getRepository(Post).findOneBy({ title: 'First Post' });

				expect(loadedPost!.meta).to.deep.equal({
					author: 'John Doe',
					keywords: ['important', 'fresh'],
				});
			}),
		));
});
