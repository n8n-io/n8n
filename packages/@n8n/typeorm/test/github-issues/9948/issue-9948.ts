import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Post } from './entity/Post';

describe("github issues > #9948 Subscribers with both 'beforeUpdate' and 'afterUpdate' methods defined cause duplicate 'updatedColumn' entries", () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				subscribers: [__dirname + '/subscriber/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should not duplicate update column', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const manager = dataSource.manager;

				const initialPost = new Post();
				initialPost.name = 'post-init';
				await manager.save(initialPost);

				initialPost.name = 'post-update';
				const updatedPost = await manager.save(initialPost);

				expect(updatedPost.updatedNameColumnsCount).to.be.eq(1);
			}),
		));
});
