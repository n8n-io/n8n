import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';

describe("github issues > #7203 QueryExpressionMap doesn't clone comment field", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should be able to clone comment field', () =>
		Promise.all(
			connections.map(async (connection) => {
				const comment = 'a comment';
				const queryBuilder = await connection.createQueryBuilder().comment(comment);
				const clonedQueryBuilder = queryBuilder.clone();
				expect(clonedQueryBuilder.expressionMap.comment).to.be.eq(comment);
			}),
		));
});
