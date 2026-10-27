import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Ticket } from './entity/Ticket';
import { Request } from './entity/Request';
import { expect } from 'chai';

describe("github issues > #161 joinAndSelect can't find entity from inverse side of relation", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should persist successfully', () =>
		Promise.all(
			connections.map(async (connection) => {
				const request = new Request();
				request.owner = 'Umed';
				request.type = 'ticket';
				request.success = false;

				const ticket = new Ticket();
				ticket.name = 'ticket #1';
				ticket.request = request;

				await connection.manager.save(ticket);

				const loadedTicketWithRequest = await connection.manager.findOne(Ticket, {
					where: {
						id: 1,
					},
					join: {
						alias: 'ticket',
						innerJoinAndSelect: {
							request: 'ticket.request',
						},
					},
				});

				expect(loadedTicketWithRequest).not.to.be.null;
				loadedTicketWithRequest!.should.be.eql({
					id: 1,
					name: 'ticket #1',
					request: {
						id: 1,
						owner: 'Umed',
						type: 'ticket',
						success: false,
					},
				});

				const loadedRequestWithTicket = await connection.manager.findOne(Request, {
					where: {
						id: 1,
					},
					join: {
						alias: 'request',
						innerJoinAndSelect: {
							ticket: 'request.ticket',
						},
					},
				});

				loadedRequestWithTicket!.should.be.eql({
					id: 1,
					owner: 'Umed',
					type: 'ticket',
					success: false,
					ticket: {
						id: 1,
						name: 'ticket #1',
					},
				});
			}),
		));

	it('should return joined relation successfully', () =>
		Promise.all(
			connections.map(async (connection) => {
				const authRequest = new Request();
				authRequest.owner = 'somebody';
				authRequest.type = 'authenticate';
				authRequest.success = true;

				await connection.manager.save(authRequest);

				const request = new Request();
				request.owner = 'somebody';
				request.type = 'ticket';
				request.success = true;

				const ticket = new Ticket();
				ticket.name = 'USD PAYMENT';

				ticket.request = request;
				request.ticket = ticket;

				await connection.manager.save(ticket);

				const loadedRequest = await connection.manager.findOne(Request, {
					where: {
						id: 2,
					},
					join: {
						alias: 'request',
						innerJoinAndSelect: { ticket: 'request.ticket' },
					},
				});

				expect(loadedRequest).not.to.be.null;
				loadedRequest!.should.be.eql({
					id: 2,
					owner: 'somebody',
					type: 'ticket',
					success: true,
					ticket: {
						id: 1,
						name: 'USD PAYMENT',
					},
				});
			}),
		));
});
