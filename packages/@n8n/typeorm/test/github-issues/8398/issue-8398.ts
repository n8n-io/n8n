import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';

describe('github issues > #8398 Separate update event into the update, soft remove and restore events', () => {
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

	it('should trigger different events for update, soft remove, and recover', () =>
		Promise.all(
			connections.map(async (connection) => {
				const manager = connection.manager;

				const post = new Post();
				post.data = 'insert';
				await manager.save(post);

				post.data = 'update';
				await manager.save(post);
				await manager.softRemove(post);
				const entity = await manager.recover(post);

				// Check if update listeners and subscribers are called only ones
				expect(entity.beforeUpdateListener).to.be.eq(1);
				expect(entity.afterUpdateListener).to.be.eq(1);
				expect(entity.beforeUpdateSubscriber).to.be.eq(1);
				expect(entity.afterUpdateSubscriber).to.be.eq(1);

				// Check if soft remove listeners and subscribers are called only ones
				expect(entity.beforeSoftRemoveListener).to.be.eq(1);
				expect(entity.afterSoftRemoveListener).to.be.eq(1);
				expect(entity.beforeSoftRemoveSubscriber).to.be.eq(1);
				expect(entity.afterSoftRemoveSubscriber).to.be.eq(1);

				// Check if recover listeners and subscribers are called only ones
				expect(entity.beforeRecoverListener).to.be.eq(1);
				expect(entity.afterRecoverListener).to.be.eq(1);
				expect(entity.beforeRecoverSubscriber).to.be.eq(1);
				expect(entity.afterRecoverSubscriber).to.be.eq(1);
			}),
		));
});
