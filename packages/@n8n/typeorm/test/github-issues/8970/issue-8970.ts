import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { TestEntity } from './entities/TestEntity';
import { expect } from 'chai';

describe('query builder order nulls first/last', async () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [__dirname + '/entities/*{.js,.ts}'],
			enabledDrivers: ['postgres', 'sqlite', 'sqlite-pooled'],
			schemaCreate: true,
			dropSchema: false,
		});
	});
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	const runTest = async (
		dataSource: DataSource,
		firstOrLastString: 'first' | 'FIRST' | 'last' | 'LAST',
	) => {
		const repository = dataSource.getRepository(TestEntity);

		const testArray = await repository.find({
			order: {
				testColumn: { direction: 'DESC', nulls: firstOrLastString },
			},
		});
		const test =
			['first', 'FIRST'].indexOf(firstOrLastString) !== -1 ? testArray.shift() : testArray.pop();

		expect(test?.testColumn).to.be.null;
	};

	it(`should work with uppercase/lowercase first/last`, async () => {
		return Promise.all(
			dataSources.map(async (dataSource) => {
				const repository = dataSource.getRepository(TestEntity);

				for (let i = 0; i < 5; i++) {
					const entity = new TestEntity();
					entity.testColumn = '';

					await repository.save(entity);
				}

				for (let i = 0; i < 5; i++) {
					const entity = new TestEntity();

					await repository.save(entity);
				}

				await runTest(dataSource, 'first');
				await runTest(dataSource, 'FIRST');
				await runTest(dataSource, 'last');
				await runTest(dataSource, 'LAST');
			}),
		);
	});
});
