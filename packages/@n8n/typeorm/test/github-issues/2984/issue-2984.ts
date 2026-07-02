import 'reflect-metadata';

import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';

describe('github issues > #2984 Discriminator conflict reported even for non-inherited tables', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/**/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load entities even with the same discriminator', () =>
		Promise.all(
			connections.map(async (connection) => {
				connection.entityMetadatas.should.have.length(5);
				connection.entityMetadatas.forEach((metadata) =>
					metadata.discriminatorValue!.should.be.oneOf(['Note', 'OwnerNote']),
				);
			}),
		));
});
