import 'reflect-metadata';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Order } from './entity/order';
import { OrderTestEntity } from './entity/order-test.entity';

describe('github issues > #7651 Enum that contains functions is not accordingly translated to SQL', () => {
	describe('entity', () => {
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

		it('should correctly save and retrieve enum fields when declaration merging technique is used and enum contains functions', () =>
			Promise.all(
				connections.map(async (connection) => {
					// GIVEN
					const orderEntity = new OrderTestEntity();
					orderEntity.id = 1;
					orderEntity.order = Order.from('_2'); // example of function call on enum to retrieve enum from string

					const orderEntityRepository = connection.getRepository(OrderTestEntity);
					await orderEntityRepository.save(orderEntity);

					// WHEN
					const loadedOrderEntity = await orderEntityRepository.findOneBy({ id: 1 });

					// THEN
					loadedOrderEntity!.order.should.be.eq(Order.SECOND);
				}),
			));

		it('should correctly save and retrieve enum array', () =>
			Promise.all(
				connections.map(async (connection) => {
					// GIVEN
					const orderEntity = new OrderTestEntity();
					orderEntity.id = 1;
					orderEntity.orders = [Order.from('_2'), Order.THIRD];

					const orderEntityRepository = connection.getRepository(OrderTestEntity);
					await orderEntityRepository.save(orderEntity);

					// WHEN
					const loadedOrderEntity = await orderEntityRepository.findOneBy({ id: 1 });

					// THEN
					loadedOrderEntity!.orders.should.be.eql([Order.SECOND, Order.THIRD]);
				}),
			));
	});

	describe('schema', () => {
		let connections: DataSource[];
		before(
			async () =>
				(connections = await createTestingConnections({
					entities: [__dirname + '/entity/*{.js,.ts}'],
					schemaCreate: false,
					dropSchema: true,
					enabledDrivers: ['postgres'],
					migrations: [],
				})),
		);
		after(() => closeTestingConnections(connections));

		it('should contain SQL for enum type without function', () =>
			Promise.all(
				connections.map(async (connection) => {
					const sqlInMemory = await connection.driver.createSchemaBuilder().log();

					sqlInMemory!.upQueries.length.should.be.greaterThan(0);
					sqlInMemory.upQueries.forEach((query) => {
						// there should be no function string in query when our ENUM TYPE is provided
						query.query.should.not.contain('function');
					});
				}),
			));
	});
});
