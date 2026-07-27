import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Person } from './entity/Person';
import { Men } from './entity/Men';
import { Women } from './entity/Women';

describe('github issues > #3857 Schema inheritance when STI pattern is used', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schema: 'custom',
				schemaCreate: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('Child classes should have same schema as parent', () =>
		Promise.all(
			connections.map(async (connection) => {
				const personMetadata = connection.getMetadata(Person);
				const menMetadata = connection.getMetadata(Men);
				const womenMetadata = connection.getMetadata(Women);
				// @ts-ignore
				personMetadata.schema.should.be.eq('custom');
				// @ts-ignore
				menMetadata.schema.should.be.eq(personMetadata.schema);
				// @ts-ignore
				womenMetadata.schema.should.be.eq(personMetadata.schema);
			}),
		));
});
