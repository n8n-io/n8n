import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import { DataSourceOptions } from '../../../src/data-source/DataSourceOptions';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
	getTypeOrmConfig,
} from '../../utils/test-utils';
import { expect } from 'chai';

import { PgEntity } from './entity/pgEntity';

const toISOString = (input: string) => new Date(input).toISOString();

const convertPropsToISOStrings = (obj: any, props: string[]) => {
	props.map((prop) => {
		obj[prop] = toISOString(obj[prop]);
	});
};

const isDriverEnabled = (driver: string) => {
	const ormConfigConnectionOptionsArray = getTypeOrmConfig();
	const config = ormConfigConnectionOptionsArray.find(
		(options: DataSourceOptions) => options.name === driver,
	);
	return config && !config.skip;
};

describe('github issues > #1716 send timestamp to database without converting it into UTC', () => {
	describe('postgres', async () => {
		if (!isDriverEnabled('postgres')) {
			return;
		}

		let connections: DataSource[];

		before(async () => {
			connections = await createTestingConnections({
				entities: [PgEntity],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			});

			for (const connection of connections) {
				if (connection.driver.options.type === 'postgres') {
					// We want to have UTC as timezone
					await connection.query("SET TIME ZONE 'UTC';");
				}
			}
		});

		beforeEach(() => reloadTestingDatabases(connections));
		after(() => closeTestingConnections(connections));

		it('should persist dates and times correctly', async () => {
			const manager = connections[0].manager;

			await manager.save(PgEntity, {
				id: 1,
				fieldTime: '14:00:00+05',
				fieldTimeWithTZ: '14:00:00+05',
				fieldTimeWithoutTZ: '14:00:00+05',
				fieldTimestamp: '2018-03-07 14:00:00+05',
				fieldTimestampWithoutTZ: '2018-03-07 14:00:00+05',
				fieldTimestampWithTZ: '2018-03-07 14:00:00+05',
			});

			const result1 = await manager.findOneBy(PgEntity, {
				id: 1,
			});
			convertPropsToISOStrings(result1, [
				'fieldTimestamp',
				'fieldTimestampWithoutTZ',
				'fieldTimestampWithTZ',
			]);

			expect(result1).to.deep.equal({
				id: 1,
				fieldTime: '14:00:00',
				fieldTimeWithTZ: '14:00:00+05',
				fieldTimeWithoutTZ: '14:00:00',
				fieldTimestamp: toISOString('2018-03-07 14:00:00+05'),
				fieldTimestampWithoutTZ: toISOString('2018-03-07 14:00:00+05'),
				fieldTimestampWithTZ: toISOString('2018-03-07 14:00:00+05'),
			});

			await manager.save(PgEntity, {
				id: 2,
				fieldTime: '17:00:00',
				fieldTimeWithTZ: '17:00:00',
				fieldTimeWithoutTZ: '17:00:00',
				fieldTimestamp: '2018-03-07 17:00:00',
				fieldTimestampWithoutTZ: '2018-03-07 17:00:00',
				fieldTimestampWithTZ: '2018-03-07 17:00:00',
			});

			const result2 = await manager.findOneBy(PgEntity, {
				id: 2,
			});
			convertPropsToISOStrings(result2, [
				'fieldTimestamp',
				'fieldTimestampWithoutTZ',
				'fieldTimestampWithTZ',
			]);

			expect(result2).to.deep.equal({
				id: 2,
				fieldTime: '17:00:00',
				fieldTimeWithTZ: '17:00:00+00',
				fieldTimeWithoutTZ: '17:00:00',
				fieldTimestamp: toISOString('2018-03-07 17:00:00'),
				fieldTimestampWithoutTZ: toISOString('2018-03-07 17:00:00'),
				fieldTimestampWithTZ: toISOString('2018-03-07 17:00:00'),
			});
		});
	});
});
