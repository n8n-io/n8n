import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { EntitySchema } from '../../../src';
import { Author, AuthorSchema } from './entity/Author';
import { Post, PostSchema } from './entity/Post';

describe('github issues > #1308 Raw Postgresql Update query result is always an empty array', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [new EntitySchema<Author>(AuthorSchema), new EntitySchema<Post>(PostSchema)],
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	async function prepareData(connection: DataSource) {
		const author = new Author();
		author.id = 1;
		author.name = 'Jane Doe';
		await connection.manager.save(author);
	}

	it('Update query returns the number of affected rows', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection);

				const result1 = await connection
					.createQueryBuilder()
					.update(Author)
					.set({ name: 'John Doe' })
					.where('name = :name', { name: 'Jonas Doe' })
					.execute();

				result1.affected!.should.be.eql(0);

				const result2 = await connection
					.createQueryBuilder()
					.update(Author)
					.set({ name: 'John Doe' })
					.where('name = :name', { name: 'Jane Doe' })
					.execute();

				result2.affected!.should.be.eql(1);
			}),
		));
});
