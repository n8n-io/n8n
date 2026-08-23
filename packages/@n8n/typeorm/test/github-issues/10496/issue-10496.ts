import 'reflect-metadata';

import { expect } from 'chai';

import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';

import { Base, A, B, C } from './entity';

describe('github issues > #10496 User-defined index name for Single Table Inheritance discriminator columns', () => {
	let dataSources: DataSource[];

	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [Base, A, B, C],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres', 'sqlite', 'sqlite-pooled'],
			})),
	);

	beforeEach(() => reloadTestingDatabases(dataSources));

	after(() => closeTestingConnections(dataSources));

	it('should create a single index for the discriminator column, with the specified column name', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();
				await queryRunner.connect();

				const table = (await queryRunner.getTable('base'))!;

				await queryRunner.release();

				const discriminatorColumnIndices = table.indices.filter(
					(index) => index.columnNames.length === 1 && index.columnNames[0] === 'type',
				);

				expect(discriminatorColumnIndices).to.have.length(1);
				expect(discriminatorColumnIndices[0].name).to.be.equal('IX_Base_type');
			}),
		));
});
