import 'reflect-metadata';
import { DataSource } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { Foo } from './entity/Foo';

describe('github issues > #9690 Incorrect SQL expression if `where` parameter is empty array', () => {
	let dataSources: DataSource[];
	before(async () => {
		dataSources = await createTestingConnections({
			enabledDrivers: ['postgres'],
			entities: [Foo],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(dataSources));

	it('should run without throw error', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const repository = dataSource.getRepository(Foo);
				await repository.find({
					where: [],
				});
			}),
		));
});
