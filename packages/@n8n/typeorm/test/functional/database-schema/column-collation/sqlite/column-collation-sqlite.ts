import 'reflect-metadata';
import { Post } from './entity/Post';
import { DataSource } from '../../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';

// skipped because there is no way to get column collation from SQLite table schema
describe.skip('database schema > column collation > sqlite', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['sqlite', 'sqlite-pooled'],
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly create column with collation option', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				const post = new Post();
				post.id = 1;
				post.name = 'Post';
				await postRepository.save(post);

				table!.findColumnByName('name')!.collation!.should.be.equal('RTRIM');
			}),
		));
});
