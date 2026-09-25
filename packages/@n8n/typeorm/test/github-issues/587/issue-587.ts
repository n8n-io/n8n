import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';

describe('github issues > #587 Ordering of fields in composite indexes defined using Index decorator', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// this test only works for fields specified as string[]
	it('should preserve field ordering when fields are specified as string[]', () =>
		Promise.all(
			connections.map(async (connection) => {
				connection.entityMetadatas.forEach((entityMetadata) => {
					entityMetadata.indices.forEach((index) => {
						if (index.givenColumnNames && Array.isArray(index.givenColumnNames)) {
							for (let i = 0; i < index.columns.length; i++) {
								const givenColumn = (index.givenColumnNames as string[])[i];
								const actualColumn = index.columns[i];
								actualColumn.propertyName.should.equal(givenColumn);
							}
						}
					});
				});
			}),
		));
});
