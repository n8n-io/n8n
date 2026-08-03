import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import First from './entity/first';
import Second from './entity/second';

describe('github issues > #4958 getRepository returns results from another Repo', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [First, Second],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('sql generated is for correct model', () =>
		Promise.all(
			connections.map(async (connection) => {
				const rawSql = await connection.getRepository(Second).createQueryBuilder('a').getSql();

				expect(rawSql).to.be.equal('SELECT "a"."notId" AS "a_notId" FROM "second" "a"');
			}),
		));
});
