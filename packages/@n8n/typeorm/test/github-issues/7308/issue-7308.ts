import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Weather } from './entity/weather';
import { expect } from 'chai';

describe('github issues > #7308 queryBuilder makes different parameter identifiers for same parameter, causing problems with groupby', () => {
	describe('Postgres & cockroachdb', () => {
		let dataSources: DataSource[];
		before(
			async () =>
				(dataSources = await createTestingConnections({
					entities: [Weather],
					enabledDrivers: ['postgres'],
					schemaCreate: true,
					dropSchema: true,
				})),
		);

		beforeEach(() => reloadTestingDatabases(dataSources));
		after(() => closeTestingConnections(dataSources));

		it('should not create different parameters identifiers for the same parameter', () =>
			Promise.all(
				dataSources.map(async (dataSource) => {
					const [query, parameters] = dataSource
						.getRepository(Weather)
						.createQueryBuilder()
						.select('round(temperature, :floatNumber)')
						.addSelect('count(*)', 'count')
						.groupBy('round(temperature, :floatNumber)')
						.setParameters({ floatNumber: 2.4 })
						.getQueryAndParameters();
					query.should.not.be.undefined;

					if (dataSource.driver.options.type === 'postgres') {
						expect(query).to.equal(
							'SELECT round(temperature, $1), count(*) AS "count" FROM "weather" "Weather" GROUP BY round(temperature, $1)',
						);
					}
					return parameters.length.should.eql(1);
				}),
			));
	});
});
