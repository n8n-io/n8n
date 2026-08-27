import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { ExampleEntity } from './entity/ExampleEntity';
import { expect } from 'chai';

describe('github issues > #9960', () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [ExampleEntity],
			enabledDrivers: ['postgres'],
		});
	});

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('select + order by must work without issues', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const example1 = new ExampleEntity();
				example1.name = 'example #1';
				await dataSource.manager.save(example1);

				const examples = await dataSource.manager
					.createQueryBuilder(ExampleEntity, 'example')
					.select(['example.id', 'example.name'])
					.addOrderBy('example.name', 'DESC', 'NULLS LAST')
					.take(1)
					.skip(0)
					.getMany();

				expect(examples).to.be.eql([{ id: 1, name: 'example #1' }]);
			}),
		);
	});
});
