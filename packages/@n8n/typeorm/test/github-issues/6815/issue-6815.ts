import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import { EntityManager } from '../../../src/entity-manager/EntityManager';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { ChildEntity } from './entity/ChildEntity';
import { ParentEntity } from './entity/ParentEntity';

describe("github issues > #6815 RelationId() on nullable relation returns 'null' string", () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it("should return null as childId if child doesn't exist", () =>
		Promise.all(
			connections.map(async (connection) => {
				const em = new EntityManager(connection);
				const parent = em.create(ParentEntity);
				await em.save(parent);

				const loaded = await em.findOneOrFail(ParentEntity, {
					where: {
						id: parent.id,
					},
				});
				expect(loaded.childId).to.be.null;
			}),
		));

	it('should return string as childId if child exists', () =>
		Promise.all(
			connections.map(async (connection) => {
				const em = new EntityManager(connection);
				const child = em.create(ChildEntity);
				await em.save(child);

				const parent = em.create(ParentEntity);
				parent.child = child;
				await em.save(parent);

				const loaded = await em.findOneOrFail(ParentEntity, {
					where: {
						id: parent.id,
					},
				});

				if (connection.name === 'cockroachdb') {
					// CockroachDB returns id as a number.
					expect(loaded.childId).to.equal(child.id.toString());
				} else {
					expect(loaded.childId).to.equal(child.id);
				}
			}),
		));
});
