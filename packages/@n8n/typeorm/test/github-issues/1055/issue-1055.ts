import 'reflect-metadata';
import '../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Parent } from './entity/Parent';
import { Child } from './entity/Child';
import { expect } from 'chai';

describe('github issues > #1055 ind with relations not working, correct syntax causes type error', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should be able to find by object reference', () =>
		Promise.all(
			connections.map(async (connection) => {
				const manager = connection.manager;

				const parent = new Parent();
				parent.name = 'Parent';
				await manager.save(parent);

				const loadedParent = await manager.findOne(Parent, {
					where: {
						id: 1,
					},
				});
				expect(loadedParent).not.to.be.null;

				if (!loadedParent) return;

				const child = connection.manager.create(Child, {
					// use alternative way of creating (to fix #1180 at the same time as well)
					name: 'Child',
					parent: loadedParent,
				});
				await manager.save(child);

				// console.log("loadedParent", loadedParent)

				const foundChild = await manager.findOne(Child, {
					where: {
						parent: {
							id: loadedParent.id,
							name: loadedParent.name,
						},
					},
				});
				expect(foundChild).not.to.be.null;
			}),
		));

	it('should not have type errors with the primary key type', () =>
		Promise.all(
			connections.map(async (connection) => {
				const manager = connection.manager;

				const parent = new Parent();
				parent.name = 'Parent';
				await manager.save(parent);

				const loadedParent = await manager.findOne(Parent, {
					where: {
						id: 1,
					},
				});
				expect(loadedParent).not.to.be.null;

				if (!loadedParent) return;

				const child = new Child();
				child.name = 'Child';
				child.parent = Promise.resolve(loadedParent);
				await manager.save(child);

				const foundChild = await manager.findOneBy(Child, {
					parent: {
						id: loadedParent.id,
					},
				});
				expect(foundChild).not.to.be.null;
			}),
		));
});
