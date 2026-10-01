import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Dummy } from './entity/Dummy';
import { ReadStream } from 'fs';
import { expect } from 'chai';
import { PostgresDriver } from '../../../src/driver/postgres/PostgresDriver';

function ingestStream(stream: ReadStream): Promise<any[]> {
	let chunks: any[] = [];
	return new Promise((ok, fail) => {
		stream.on('data', (chunk) => chunks.push(chunk));
		stream.on('error', fail);
		stream.on('end', () => ok(chunks));
	});
}

describe('github issues > #7109 stream() bug from 0.2.25 to 0.2.26 with postgresql', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should release the QueryRunner created by a SelectQueryBuilder', () =>
		Promise.all(
			connections
				.filter((connection) => {
					if (connection.driver instanceof PostgresDriver) {
						// The native driver (pg-native) does not support
						// streaming because pg-query-stream requires access to
						// the wire protocol which is not available through the
						// native libpq bindings
						if (connection.driver.isNative) {
							console.log(
								'Skipping streaming test: pg-native is incompatible with pg-query-stream',
							);
							return false;
						}
					}
					return true;
				})
				.map(async (connection) => {
					const values = [{ field: 'abc' }, { field: 'def' }, { field: 'ghi' }];
					// First create some test data
					await connection.createQueryBuilder().insert().into(Dummy).values(values).execute();

					// Stream data:
					const stream = await connection
						.createQueryBuilder()
						.from(Dummy, 'dummy')
						.select('field')
						.stream();
					const streamedEntities = await ingestStream(stream);

					// If the runner is properly released, the test is already successful; this assert is just a sanity check.
					const extractFields = (val: { field: string }) => val.field;
					expect(streamedEntities.map(extractFields)).to.have.members(values.map(extractFields));
				}),
		));
});
