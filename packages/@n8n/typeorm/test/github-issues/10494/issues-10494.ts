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

describe('github issues > #10494 Custom discriminator values when using Single Table Inheritance with Entity Schemas', () => {
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

	it('should use custom discriminator values, when specified', () =>
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
				// B doesn't specify a discriminator value, so it should
				// default to its class name
				expect(loadedEntities[0]).to.be.instanceOf(B);
				expect(loadedEntities[0].type).to.be.equal('B');

				expect(loadedEntities[1]).to.be.instanceOf(A);
				expect(loadedEntities[1].type).to.be.equal('custom-a');

				expect(loadedEntities[2]).to.be.instanceOf(C);
				expect(loadedEntities[2].type).to.be.equal('custom-c');
			}),
		));
});
