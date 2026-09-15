import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';

import { expect } from 'chai';
import { PostgresDriver } from '../../../src/driver/postgres/PostgresDriver';
import { VersionUtils } from '../../../src/util/VersionUtils';

describe('github issues > #9318 Change version query from SHOW server_version to SELECT version', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [],
				schemaCreate: false,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should have proper isGeneratedColumnsSupported value for postgres version', () =>
		Promise.all(
			connections.map(async (connection) => {
				const { isGeneratedColumnsSupported } = connection.driver as PostgresDriver;
				const result = await connection.query('SELECT VERSION()');
				const dbVersion = result[0]['version'].replace(/^PostgreSQL ([\d.]+) .*$/, '$1');
				const versionGreaterOfEqualTo12 = VersionUtils.isGreaterOrEqual(dbVersion, '12.0');

				expect(isGeneratedColumnsSupported).to.eq(versionGreaterOfEqualTo12);
			}),
		));
});
