import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Message, MessageType } from './entity/Message';
import { Recipient } from './entity/Recipient';
import { User } from './entity/User';
import { Chat } from './entity/Chat';

describe('github issues > #1551 complex example of cascades + multiple primary keys = persistence order', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				__dirname,
				// enabledDrivers: [],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('throws an error because there is no object id defined', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User({
					username: 'ethan',
					password: '$2a$08$NO9tkFLCoSqX1c5wk3s7z.JfxaVMKA.m7zUDdDwEquo4rvzimQeJm',
					name: 'Ethan Gonzalez',
					picture: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
					phone: '+391234567890',
				});
				await connection.manager.save(user1);

				const user5 = new User({
					username: 'ray',
					password: '$2a$08$6.mbXqsDX82ZZ7q5d8Osb..JrGSsNp4R3IKj7mxgF6YGT0OmMw242',
					name: 'Ray Edwards',
					picture: 'https://randomuser.me/api/portraits/thumb/men/3.jpg',
					phone: '+391234567894',
				});
				await connection.manager.save(user5);

				await connection.manager.save(
					new Chat({
						allTimeMembers: [user1, user5],
						listingMembers: [user1, user5],
						messages: [
							new Message({
								sender: user1,
								content: 'I should buy a boat',
								type: MessageType.TEXT,
								holders: [user1, user5],
								recipients: [
									new Recipient({
										user: user5,
									}),
								],
							}),
							new Message({
								sender: user1,
								content: 'You still there?',
								type: MessageType.TEXT,
								holders: [user1, user5],
								recipients: [
									new Recipient({
										user: user5,
									}),
								],
							}),
						],
					}),
				);

				const messages = await connection.manager.find(Message);
				messages[0].recipients.length.should.be.equal(1);
				messages[1].recipients.length.should.be.equal(1);

				const recipients = await connection.manager.find(Recipient);
				recipients.length.should.be.equal(2);
			}),
		));

	// cascade remove are not supported
	it.skip("throws a \"update or delete on table 'message' violates foreign key constraint on table 'recipient'\" error on delete", () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User({
					username: 'ethan',
					password: '$2a$08$NO9tkFLCoSqX1c5wk3s7z.JfxaVMKA.m7zUDdDwEquo4rvzimQeJm',
					name: 'Ethan Gonzalez',
					picture: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
					phone: '+391234567890',
				});
				await connection.manager.save(user1);

				const user5 = new User({
					username: 'ray',
					password: '$2a$08$6.mbXqsDX82ZZ7q5d8Osb..JrGSsNp4R3IKj7mxgF6YGT0OmMw242',
					name: 'Ray Edwards',
					picture: 'https://randomuser.me/api/portraits/thumb/men/3.jpg',
					phone: '+391234567894',
				});
				await connection.manager.save(user5);

				await connection.manager.save(
					new Chat({
						allTimeMembers: [user1, user5],
						listingMembers: [user1, user5],
						messages: [
							new Message({
								sender: user1,
								content: 'I should buy a boat',
								type: MessageType.TEXT,
								holders: [user1, user5],
								recipients: [
									new Recipient({
										user: user5,
									}),
								],
							}),
							new Message({
								sender: user1,
								content: 'You still there?',
								type: MessageType.TEXT,
								holders: [user1, user5],
								recipients: [
									new Recipient({
										user: user5,
									}),
								],
							}),
						],
					}),
				);

				const message = await connection.createQueryBuilder(Message, 'message').getOne();

				if (message) {
					await connection.getRepository(Message).remove(message);
				} else {
					throw new Error('Cannot get message');
				}

				const messages = await connection.manager.find(Message);
				messages.length.should.be.equal(0);

				const recipients = await connection.manager.find(Recipient);
				recipients.length.should.be.equal(0);
			}),
		));

	// cascade remove are not supported
	it.skip('throws a "null value in column \'userId\' violates not-null constraint" error on delete', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User({
					username: 'ethan',
					password: '$2a$08$NO9tkFLCoSqX1c5wk3s7z.JfxaVMKA.m7zUDdDwEquo4rvzimQeJm',
					name: 'Ethan Gonzalez',
					picture: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
					phone: '+391234567890',
				});
				await connection.manager.save(user1);

				const user5 = new User({
					username: 'ray',
					password: '$2a$08$6.mbXqsDX82ZZ7q5d8Osb..JrGSsNp4R3IKj7mxgF6YGT0OmMw242',
					name: 'Ray Edwards',
					picture: 'https://randomuser.me/api/portraits/thumb/men/3.jpg',
					phone: '+391234567894',
				});
				await connection.manager.save(user5);

				await connection.manager.save(
					new Chat({
						allTimeMembers: [user1, user5],
						listingMembers: [user1, user5],
						messages: [
							new Message({
								sender: user1,
								content: 'I should buy a boat',
								type: MessageType.TEXT,
								holders: [user1, user5],
								recipients: [
									new Recipient({
										user: user5,
									}),
								],
							}),
							new Message({
								sender: user1,
								content: 'You still there?',
								type: MessageType.TEXT,
								holders: [user1, user5],
								recipients: [
									new Recipient({
										user: user5,
									}),
								],
							}),
						],
					}),
				);

				await connection.getRepository(Message).remove(await connection.manager.find(Message));

				const messages = await connection.manager.find(Message);
				messages.length.should.be.equal(0);

				const recipients = await connection.manager.find(Recipient);
				recipients.length.should.be.equal(0);
			}),
		));

	// cascade remove are not supported
	it.skip('throws a "Subject Recipient must have an identifier to perform operation" internal error on delete', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User({
					username: 'ethan',
					password: '$2a$08$NO9tkFLCoSqX1c5wk3s7z.JfxaVMKA.m7zUDdDwEquo4rvzimQeJm',
					name: 'Ethan Gonzalez',
					picture: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
					phone: '+391234567890',
				});
				await connection.manager.save(user1);

				const user5 = new User({
					username: 'ray',
					password: '$2a$08$6.mbXqsDX82ZZ7q5d8Osb..JrGSsNp4R3IKj7mxgF6YGT0OmMw242',
					name: 'Ray Edwards',
					picture: 'https://randomuser.me/api/portraits/thumb/men/3.jpg',
					phone: '+391234567894',
				});
				await connection.manager.save(user5);

				await connection.manager.save(
					new Chat({
						allTimeMembers: [user1, user5],
						listingMembers: [user1, user5],
						messages: [
							new Message({
								sender: user1,
								content: 'I should buy a boat',
								type: MessageType.TEXT,
								holders: [user1, user5],
								recipients: [
									new Recipient({
										user: user5,
									}),
								],
							}),
							new Message({
								sender: user1,
								content: 'You still there?',
								type: MessageType.TEXT,
								holders: [user1, user5],
								recipients: [
									new Recipient({
										user: user5,
									}),
								],
							}),
						],
					}),
				);

				let recipients = await connection.manager.find(Recipient);

				for (let recipient of recipients) {
					await connection.getRepository(Recipient).remove(recipient);
				}

				recipients = await connection.manager.find(Recipient);
				recipients.length.should.be.equal(0);
			}),
		));
});
