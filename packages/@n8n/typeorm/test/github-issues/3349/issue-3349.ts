import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Category } from './entity/Category';
import { In } from '../../../src';
import { expect } from 'chai';

describe('github issues > #3349 Multiple where conditions with parameters', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work with query builder', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repository = connection.getRepository(Category);
				const category = new Category();
				category.id = 1;
				category.myField = 2;
				await repository.save(category);

				const result = await connection
					.createQueryBuilder()
					.select('category')
					.from(Category, 'category')
					.where('category.id = :ida', { ida: 1 })
					.orWhereInIds([2])
					.orWhereInIds([3])
					.execute();

				expect(result).lengthOf(1);
			}),
		));

	it('should work with findOne', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repository = connection.getRepository(Category);
				const category = new Category();
				category.id = 1;
				category.myField = 2;
				await repository.save(category);

				const result = await repository.findOneBy({
					id: 1,
					myField: In([2, 3]),
				});

				expect(result).to.not.be.null;
			}),
		));
});
