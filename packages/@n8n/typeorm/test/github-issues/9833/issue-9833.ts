import 'reflect-metadata';

import { expect } from 'chai';

import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Repository } from '../../../src';

import { Base, A, B, C } from './entity';
import { BaseSchema, ASchema, BSchema, CSchema } from './schema';

describe('github issues > #9833 Add support for Single Table Inheritance when using Entity Schemas', () => {
	let dataSources: DataSource[];

	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [BaseSchema, ASchema, BSchema, CSchema],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres', 'sqlite', 'sqlite-pooled'],
			})),
	);

	beforeEach(() => reloadTestingDatabases(dataSources));

	after(() => closeTestingConnections(dataSources));

	it('should instantiate concrete entities when using EntitySchema', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				// Arrange
				const repository: Repository<Base> = dataSource.getRepository(Base);

				const entities: Base[] = [new A(true), new B(42), new C('foo')];

				await repository.save(entities);

				// Act
				const loadedEntities = await repository.find({
					order: { type: 'ASC' },
				});

				// Assert
				expect(loadedEntities[0]).to.be.instanceOf(A);
				expect(loadedEntities[1]).to.be.instanceOf(B);
				expect(loadedEntities[2]).to.be.instanceOf(C);
			}),
		));
});
