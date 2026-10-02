import 'reflect-metadata';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Example } from './entity/Example';

describe('github issues > #10191 incorrect escaping of indexPredicate', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Example],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not fail', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.manager.upsert(
					Example,
					{
						nonNullable: 'nonNullable',
						nullable: 'nullable',
						value: 'value',
					},
					{
						conflictPaths: {
							nonNullable: true,
							nullable: true,
						},
						skipUpdateIfNoValuesChanged: true,
						indexPredicate: '"nullable" IS NOT NULL',
					},
				);
			}),
		));
});
