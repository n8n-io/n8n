import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { assert } from 'chai';

describe('github issues > #4185 afterLoad() subscriber interface missing additional info available on other events', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				subscribers: [__dirname + '/subscriber/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should invoke afterLoad() with LoadEvent', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new Post();
				post1.id = 1;
				const post2 = new Post();
				post2.id = 2;
				await connection.manager.save([post1, post2]);

				const entities = await connection.manager.getRepository(Post).find();
				assert.strictEqual(entities.length, 2);
				for (const entity of entities) {
					assert.isDefined(entity.simpleSubscriberSaw);
					const event = entity.extendedSubscriberSaw;
					assert.isDefined(event);
					assert.strictEqual(event!.connection, connection);
					assert.isDefined(event!.queryRunner);
					assert.isDefined(event!.manager);
					assert.strictEqual(event!.entity, entity);
					assert.isDefined(event!.metadata);
				}
			}),
		));
});
