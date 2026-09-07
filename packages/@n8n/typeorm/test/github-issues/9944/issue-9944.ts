import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { A } from './entity/A';
import { B } from './entity/B';
import { C } from './entity/C';

describe('github issues > #9944 Alias Issue With Nested Entity And Relations', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				relationLoadStrategy: 'query',
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('Validate correct loading of eager, nested relations', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const aEntity = new A();
				aEntity.b = new B();
				aEntity.b.cs = [new C()];
				await dataSource.manager.save(aEntity);

				const [fetchedA] = await dataSource.manager.find(A);
				expect(fetchedA.b).exist; // Validates correct relation A.b is loaded
				expect(fetchedA.b.cs).exist; // Validates correct relation A.b.cs is loaded
				expect(fetchedA.b.cs[0]).exist;
			}),
		));
});
