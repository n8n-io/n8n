import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Post } from './entity/Post';
import { In } from '../../../src';

describe('github issues > #1245 `findByIds` ignores `FindManyOptions`', () => {
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

	it('should filter correctly using findByIds', () =>
		Promise.all(
			connections.map(async (connection) => {
				let post1 = new Post();
				post1.name = 'some_name';

				let post2 = new Post();
				post2.name = 'some_name';

				let post3 = new Post();
				post3.name = 'other_name';

				await connection.manager.save([post1, post2, post3]);

				expect(
					await connection.manager.findBy(Post, {
						id: In([post2.id, post3.id]),
						name: 'some_name',
					}),
				).to.eql([post2]);
			}),
		));

	it('should filter correctly using findByIds', () =>
		Promise.all(
			connections.map(async (connection) => {
				let post1 = new Post();
				post1.name = 'some_name';

				let post2 = new Post();
				post2.name = 'some_name';

				let post3 = new Post();
				post3.name = 'other_name';

				await connection.manager.save([post1, post2, post3]);

				expect(
					await connection.manager.findBy(Post, {
						id: In([post2.id, post3.id]),
						name: 'some_name',
					}),
				).to.eql([post2]);
			}),
		));
});
