import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Bar } from './entity/Bar';
import { Foo } from './entity/Foo';

// TODO: this test was broken after removing primary: true from relation decorators
//  due to complexity of cascades, it was skipped fow now
describe.skip('github issues > #7002 cascade save fails if the child entity has CreateDateColumn and PK as JoinColumn', () => {
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

	it('save an entity having a child entity with shared PK and CreatedDateColumn by cascade', () =>
		Promise.all(
			connections.map(async (connection) => {
				const foo = new Foo();
				foo.text = 'This is a feature post';

				await connection.manager.save(
					connection.getRepository(Bar).create({
						title: 'Feature Post',
						foo,
					}),
				);
			}),
		));
});
