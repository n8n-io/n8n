import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Example } from './entity/example';

describe('github issues > #10249 Saving an entity is not possible if only columns with update: false are changed', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [Example],
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should ignore changes for columns with `update: false` on saving entity', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await Promise.all(
					dataSources.map(async (dataSource) => {
						const manager = dataSource.manager;

						// create entity
						let exampleEntity = new Example();
						exampleEntity.id = '1';
						exampleEntity.notUpdatable = 'value1';
						exampleEntity.updatable = 'value1';
						await manager.save(exampleEntity);

						// updates only updatable value
						exampleEntity.notUpdatable = 'value2';
						exampleEntity.updatable = 'value2';
						await manager.save(exampleEntity);

						exampleEntity = (await manager.findOneBy(Example, {
							id: '1',
						}))!;
						expect(exampleEntity.notUpdatable).to.be.eql('value1');
						expect(exampleEntity.updatable).to.be.eql('value2');

						// if `update: false` column only specified, do nothing
						exampleEntity.notUpdatable = 'value3';
						await manager.save(exampleEntity);

						exampleEntity = (await manager.findOneBy(Example, {
							id: '1',
						}))!;
						expect(exampleEntity.notUpdatable).to.be.eql('value1');
						expect(exampleEntity.updatable).to.be.eql('value2');
					}),
				);
			}),
		));
});
