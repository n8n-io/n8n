import { expect } from 'chai';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Person } from './entity/person';
import { Todo } from './entity/todo';

describe('github issues > #10040 TypeORM synchronize database even if it is up to date', () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [Person, Todo],
			enabledDrivers: ['postgres', 'sqlite-pooled'],
		});
	});

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should return an empty array for the upQueries after sync', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				await dataSource.synchronize();
				const logs = await dataSource.driver.createSchemaBuilder().log();
				expect(logs.upQueries.length).to.be.eql(0);
			}),
		);
	});
});
