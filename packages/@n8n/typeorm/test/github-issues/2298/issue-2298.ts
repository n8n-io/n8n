import 'reflect-metadata';
import { DataSource, In } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Product } from './entity/Product';
import { Ticket } from './entity/Ticket';
import { TicketProduct } from './entity/TicketProduct';

describe('github issues > #2298 - Repository filtering not considering related columns as filter', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work perfectly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const product1 = new Product();
				await connection.manager.save(product1);
				const product2 = new Product();
				await connection.manager.save(product2);

				const ticket1 = new Ticket();
				ticket1.shopId = 'myshopId1';
				ticket1.chainId = 'myChainId1';
				await connection.manager.save(ticket1);

				const ticket2 = new Ticket();
				ticket2.shopId = 'myshopId1';
				ticket2.chainId = 'myChainId2';
				await connection.manager.save(ticket2);

				const ticketProduct1 = new TicketProduct();
				ticketProduct1.product = product1;
				ticketProduct1.ticket = ticket1;
				await connection.manager.save(ticketProduct1);

				const ticketProduct2 = new TicketProduct();
				ticketProduct2.product = product1;
				ticketProduct2.ticket = ticket1;
				await connection.manager.save(ticketProduct2);

				const ticketProduct3 = new TicketProduct();
				ticketProduct3.product = product2;
				ticketProduct3.ticket = ticket2;
				await connection.manager.save(ticketProduct3);

				const ticketProduct4 = new TicketProduct();
				ticketProduct4.product = product2;
				ticketProduct4.ticket = ticket2;
				await connection.manager.save(ticketProduct4);

				const loadedTicket = await connection.manager.find(Ticket, {
					where: {
						shopId: 'myshopId1',
						chainId: In(['myChainId1', 'myChainId2']),
						ticketItems: {
							product: {
								id: In([2, 3]),
							},
						},
					},
					relations: {
						ticketItems: {
							product: true,
						},
					},
					order: {
						ticketItems: {
							id: 'asc',
						},
					},
				});

				loadedTicket.should.be.eql([
					{
						id: 2,
						shopId: 'myshopId1',
						chainId: 'myChainId2',
						ticketItems: [
							{
								id: 3,
								product: {
									id: 2,
								},
							},
							{
								id: 4,
								product: {
									id: 2,
								},
							},
						],
					},
				]);
			}),
		));
});
