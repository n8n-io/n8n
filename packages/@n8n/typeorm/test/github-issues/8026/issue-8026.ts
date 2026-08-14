import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { Sailing } from './entity/Sailing';
import { ScheduledSailing } from './entity/ScheduledSailing';

describe('github issues > #8026 Inserting a value for a column that has a relation, and is also a date, results in the value being inserted as DEFAULT', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Sailing, ScheduledSailing],
				schemaCreate: true,
				dropSchema: true,
			})),
	);

	after(() => closeTestingConnections(connections));

	it('it should include a related date column in the constructed query', async () =>
		await Promise.all(
			connections.map(async (connection) => {
				let queryBuilder = await connection.createQueryBuilder();

				const insertValue = {
					scheduled_departure_time: new Date(),
					scheduled_arrival_time: new Date(),
				};

				const [query, params] = await queryBuilder
					.insert()
					.into(ScheduledSailing)
					.values([insertValue])
					.getQueryAndParameters();

				expect(query.includes('DEFAULT')).to.be.false;
				expect(params).length(2);
			}),
		));
});
