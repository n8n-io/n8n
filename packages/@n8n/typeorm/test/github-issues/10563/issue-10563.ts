import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { assert } from 'chai';
import { Dog } from './entity/family';

describe('github issues > #10653 Default value in child table/entity column decorator for multiple table inheritance is ignored for inherited columns', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				logging: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should honor distinct default value configured on inherited column of child entity', async () =>
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const manager = dataSource.manager;
				let dog: Dog = new Dog();
				dog.name = 'Fifi';
				await manager.save(dog);
				let fifi = await manager.findOneBy(Dog, {
					name: 'Fifi',
				});
				assert(fifi instanceof Dog && fifi['type'] == 'PET', `Fifi=${JSON.stringify(fifi)}`);
			}),
		));
});
