import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { Question } from './entity/Question';

describe('github issues > #778 TypeORM is ignoring the `type` field when set on a PrimaryGeneratedColumn', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly parse type from PrimaryGeneratedColumn options', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const postTable = await queryRunner.getTable('post');
				const categoryTable = await queryRunner.getTable('category');
				const questionTable = await queryRunner.getTable('question');
				await queryRunner.release();

				const post = new Post();
				post.name = 'Post #1';
				await connection.getRepository(Post).save(post);

				const category = new Category();
				category.name = 'Category #1';
				await connection.getRepository(Category).save(category);

				const question = new Question();
				question.name = 'Question #1';
				await connection.getRepository(Question).save(question);

				postTable!.findColumnByName('id')!.type.should.be.equal('integer');
				categoryTable!.findColumnByName('id')!.type.should.be.equal('bigint');
				questionTable!.findColumnByName('id')!.type.should.be.equal('smallint');
			}),
		));
});
