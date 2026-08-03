import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Order } from './entity/Order';
import { OrderCustomer } from './entity/OrderCustomer';
import { OrderRepository } from './repository/OrderRepository';
import { Broker } from './entity/Broker';
import { BrokerRepository } from './repository/BrokerRepository';

describe('github issues > #3246 Saving an entity with a 1:1 cascading insert does not return id if entity has nullable many:one relationship', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Order, OrderCustomer, Broker],
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should insert and return the order with id', () =>
		Promise.all(
			connections.map(async (connection) => {
				let company = new Broker();
				company.name = 'Acme Inc.';

				let order = new Order();
				order.orderReferenceNumber = 'abcd';

				const orderCustomer = new OrderCustomer();
				orderCustomer.name = 'Dave';
				order.orderCustomer = orderCustomer;

				const myCompanyRepository = connection.manager.getCustomRepository(BrokerRepository);
				const createdCompany = await myCompanyRepository.createBroker(company);
				const myOrderRepository = connection.manager.getCustomRepository(OrderRepository);
				order.company = createdCompany;

				const result = await myOrderRepository.createOrder(order);

				expect(result.id).not.to.be.null;
			}),
		));
});
