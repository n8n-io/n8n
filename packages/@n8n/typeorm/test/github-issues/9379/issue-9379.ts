import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { SuperLongTableName } from './entity/SuperLongTableName';
import { SuperLongTableNameWhichIsRelatedToOriginalTable } from './entity/SuperLongTableNameIsRelatedToOriginal';

describe('github issues > #9379 RelationIdLoader is not respecting maxAliasLength', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should fetch related entities properly', async () => {
		for (const connection of connections) {
			const origin = await connection.getRepository(SuperLongTableName).save({ name: 'test' });

			await connection.getRepository(SuperLongTableNameWhichIsRelatedToOriginalTable).save({
				superLongTableNameId: origin.id,
			});

			const result = await connection.getRepository(SuperLongTableName).findOne({
				where: { id: origin.id },
				relations: { relatedToOriginal: true },
				relationLoadStrategy: 'query',
			});

			expect(result?.relatedToOriginal.length).to.eq(1);
		}
	});
});
