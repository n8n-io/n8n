import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src';
import { getTypeOrmConfig } from '../../utils/test-utils';
import { PostgresConnectionOptions } from '../../../src/driver/postgres/PostgresConnectionOptions';

describe("github issues > #2096 [mysql] Database name isn't read from url", () => {
	it('should be possible to define a database by connection url for mysql', async () => {
		const config = getTypeOrmConfig();

		// it is important to synchronize here, to trigger EntityMetadataValidator.validate
		// that previously threw the error where the database on the driver object was undefined
		const postgresConfig: PostgresConnectionOptions = config.find(
			(c) => c.name === 'postgres' && !c.skip,
		) as PostgresConnectionOptions;

		if (postgresConfig) {
			const { username, password, host, port, database } = postgresConfig;

			const url = `mysql://${username}:${password}@${host}:${port}/${database}`;

			const dataSource = new DataSource({
				name: '#2096',
				url,
				entities: [__dirname + '/entity/*{.js,.ts}'],
				synchronize: true,
				type: 'postgres',
			});
			await dataSource.initialize();
			expect(dataSource.isInitialized).to.eq(true);
			await dataSource.destroy();
		}
	});
});
