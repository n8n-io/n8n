import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { JSONBKeyTest } from './entity/test';

describe('github issues > #6833 Entities with JSON key columns are incorrectly grouped', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [JSONBKeyTest],
				dropSchema: true,
				schemaCreate: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('jsonB keys are correctly resolved', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.transaction(async (manager) => {
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 1, second: 2 },
						}),
					);
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 1, second: 3 },
						}),
					);

					const entities = await manager
						.createQueryBuilder(JSONBKeyTest, 'json_test')
						.select()
						.getMany();
					expect(entities.length).to.equal(2);
				});
			}),
		));

	it('jsonB keys can be found', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.transaction(async (manager) => {
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 3, second: 3 },
						}),
					);
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 4, second: 3 },
						}),
					);

					const entities = await manager.find(JSONBKeyTest, {
						where: { id: { first: 3, second: 3 } },
					});
					expect(entities.length).to.equal(1);
					expect(entities[0].id).to.deep.equal({
						first: 3,
						second: 3,
					});
				});
			}),
		));

	it('jsonB keys can be found with IN', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.transaction(async (manager) => {
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 3, second: 3 },
						}),
					);
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 4, second: 3 },
						}),
					);
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 5, second: 3 },
						}),
					);
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 6, second: 4 },
						}),
					);

					const entities = await manager
						.createQueryBuilder(JSONBKeyTest, 'json_test')
						.select()
						.where('id IN (:...ids)', {
							ids: [
								{ first: 5, second: 3 },
								{ first: 6, second: 4 },
							],
						})
						.getMany();
					expect(entities.length).to.equal(2);
					expect(entities[0].id).to.deep.equal({
						first: 5,
						second: 3,
					});
					expect(entities[1].id).to.deep.equal({
						first: 6,
						second: 4,
					});
				});
			}),
		));

	it('jsonB keys can be found regardless of order', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.transaction(async (manager) => {
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 3, second: 3 },
						}),
					);
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 4, second: 3 },
						}),
					);
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 5, second: 3 },
						}),
					);
					await manager.save(
						manager.create(JSONBKeyTest, {
							id: { first: 6, second: 4 },
						}),
					);

					const payload = { second: 2, first: 1 };
					await manager.save(manager.create(JSONBKeyTest, { id: payload }));
					const entities = await manager.find(JSONBKeyTest, {
						where: { id: payload },
					});
					expect(entities.length).to.equal(1);
					expect(entities[0].id).to.deep.equal({
						first: 1,
						second: 2,
					});

					const entitiesOtherOrder = await manager.find(JSONBKeyTest, {
						where: { id: { first: 1, second: 2 } },
					});
					expect(entitiesOtherOrder.length).to.equal(1);
					expect(entitiesOtherOrder[0].id).to.deep.equal({
						first: 1,
						second: 2,
					});
				});
			}),
		));
});
