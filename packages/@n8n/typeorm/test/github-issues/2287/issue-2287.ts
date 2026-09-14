import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Post } from './entity/Post';

describe('github issues > #2287 - QueryBuilder IN and ANY Fail with .where - Postgres', () => {
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

	it('should allow to explicitly insert primary key value', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new Post();
				post1.skill_id_array = [1, 2];
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.skill_id_array = [2];
				await connection.manager.save(post2);

				const result1 = await connection
					.getRepository(Post)
					.createQueryBuilder('post') // you shall assign an alias
					.where(':id = ANY(post.skill_id_array)', { id: 1 }) // and use that alias everywhere in your query builder
					.getMany();

				result1.should.be.eql([{ id: 1, skill_id_array: [1, 2] }]);

				const result2 = await connection
					.getRepository(Post)
					.createQueryBuilder('post') // you shall assign an alias
					.where(':id = ANY(post.skill_id_array)', { id: 2 }) // and use that alias everywhere in your query builder
					.getMany();

				result2.should.be.eql([
					{ id: 1, skill_id_array: [1, 2] },
					{ id: 2, skill_id_array: [2] },
				]);
			}),
		));
});
