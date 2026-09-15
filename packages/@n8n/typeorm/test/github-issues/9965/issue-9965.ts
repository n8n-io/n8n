import Sinon, { spy } from 'sinon';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Book } from './entity/Book';
import { User } from './entity/User';
import { BorrowedSubscriber } from './subscriber/BorrrowedSubscriber';
import { expect } from 'chai';

describe('github issues > #9965', () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [Book, User],
			subscribers: [BorrowedSubscriber],
			enabledDrivers: ['postgres'],
			schemaCreate: true,
			dropSchema: true,
		});
	});

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should pass entityId to afterInsert method', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const testBook = dataSource.manager.create(Book, {
					name: 'TestPost',
				});
				await dataSource.manager.save(testBook);

				const testUser = dataSource.manager.create(User, {
					name: 'TestUser',
				});
				await dataSource.manager.save(testUser);

				testUser.borrowed = [testBook];

				const [subscriber] = dataSource.subscribers;
				const beforeInsert = spy(subscriber, 'afterInsert');

				await dataSource.manager.save(testUser);

				expect(beforeInsert.called).to.be.true;
				expect(
					beforeInsert.calledWith(
						Sinon.match((event) => {
							return (
								typeof event.entityId?.userId === 'string' &&
								typeof event.entityId?.bookId === 'string'
							);
						}),
					),
				).to.be.ok;
			}),
		));
});
