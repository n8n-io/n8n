import 'reflect-metadata';

import { assert } from 'chai';

import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { TestChild } from './entity/TestChild';
import { TestParent } from './entity/TestParent';

describe('github issues > #5520 save does not return generated id if object to save contains a many to one relationship with an undefined id', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should generate parents and childs uuid and return them', () =>
		Promise.all(
			connections.map(async (connection) => {
				let entity = new TestParent();
				let entityChild = new TestChild();
				entityChild.value = 'test';
				entity.child = entityChild;

				let response = await connection.getRepository(TestParent).save(entity);

				assert(response.uuid, 'parent uuid should be generated and set');
				assert(response.child.uuid, 'child uuid should be generated and set');
			}),
		));
});
