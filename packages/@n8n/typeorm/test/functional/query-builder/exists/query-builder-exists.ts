import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Test } from './entity/Test';

describe('query builder > exists', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Test],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('Exists query of empty table should be false', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo = connection.getRepository(Test);

				const exists = await repo.exists();
				expect(exists).to.be.equal(false);
			}),
		));

	it('Exists query of non empty table should be true', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo = connection.getRepository(Test);

				await repo.save({ id: 'ok' });
				await repo.save({ id: 'nok' });

				const exists = await repo.exists();
				expect(exists).to.be.equal(true);
			}),
		));
});
