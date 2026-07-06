import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Dummy } from './entity/dummy';
import { transformer, WrappedNumber } from './transformer';

describe('github issues > #2557 object looses its prototype before transformer.to()', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should give correct object in transformer.to', () =>
		Promise.all(
			connections.map(async (connection) => {
				const dummy = new Dummy();
				dummy.id = 1;
				dummy.num = new WrappedNumber(3);

				await connection.getRepository(Dummy).save(dummy);

				expect(transformer.lastValue).to.be.instanceOf(WrappedNumber);
			}),
		));

	// you can add additional tests if needed
});
