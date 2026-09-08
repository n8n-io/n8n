import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { ExampleEntity } from './entity/ExampleEntity';

describe('github issues > #9895', () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [ExampleEntity],
			enabledDrivers: ['postgres'],
		});
	});

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should allow find order on object property', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				await dataSource.manager.find(ExampleEntity, {
					order: {
						total: 'DESC',
					},
				});
			}),
		);
	});
});
