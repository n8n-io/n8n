import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { ConnectionMetadataBuilder } from '../../../../src/connection/ConnectionMetadataBuilder';
import { EntityMetadataValidator } from '../../../../src/metadata-builder/EntityMetadataValidator';
import { DriverFactory } from '../../../../src/driver/DriverFactory';
import { expect } from 'chai';

describe('persistence > order of persistence execution operations', () => {
	describe('should throw exception when non-resolvable circular relations found', function () {
		it('should throw CircularRelationsError', async () => {
			const connection = new DataSource({
				// dummy connection options, connection won't be established anyway
				type: 'postgres',
				host: 'localhost',
				username: 'test',
				password: 'test',
				database: 'test',
				entities: [__dirname + '/entity/*{.js,.ts}'],
			});
			connection.driver = await DriverFactory.create(connection);
			const connectionMetadataBuilder = new ConnectionMetadataBuilder(connection);
			const entityMetadatas = await connectionMetadataBuilder.buildEntityMetadatas([
				__dirname + '/entity/*{.js,.ts}',
			]);
			const entityMetadataValidator = new EntityMetadataValidator();
			expect(() =>
				entityMetadataValidator.validateMany(entityMetadatas, connection.driver),
			).to.throw(Error);
		});
	});

	describe.skip('should persist all entities in correct order', function () {
		let connections: DataSource[];
		before(
			async () =>
				(connections = await createTestingConnections({
					entities: [__dirname + '/entity/*{.js,.ts}'],
				})),
		);
		beforeEach(() => reloadTestingDatabases(connections));
		after(() => closeTestingConnections(connections));
		it('', () =>
			Promise.all(
				connections.map(async (connection) => {
					// create first category and post and save them
					const category1 = new Category();
					category1.name = 'Category saved by cascades #1';

					const post1 = new Post();
					post1.title = 'Hello Post #1';
					post1.category = category1;

					await connection.manager.save(post1);

					// now check
					/*const posts = await connection.manager.find(Post, {
             alias: "post",
             innerJoinAndSelect: {
             category: "post.category"
             },
             orderBy: {
             "post.id": "ASC"
             }
             });

             posts.should.be.eql([{
             id: 1,
             title: "Hello Post #1",
             category: {
             id: 1,
             name: "Category saved by cascades #1"
             }
             }, {
             id: 2,
             title: "Hello Post #2",
             category: {
             id: 2,
             name: "Category saved by cascades #2"
             }
             }]);*/
				}),
			));
	});
});
