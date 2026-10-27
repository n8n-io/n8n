import 'reflect-metadata';
import {
	createTestingConnections as createTestingDatasources,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Product } from './entity/product';
import { Category } from './entity/category';
import { FindManyOptions } from '../../../src';

describe('github issues > #9988 RelationIdLoader reuses the same queryplanner within a transaction', () => {
	let dataSources: DataSource[];

	before(
		async () =>
			(dataSources = await createTestingDatasources({
				entities: [Product, Category],
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('custom repository querybuilders within transactions returns relations for getOne() and getMany', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const manager = dataSource.manager;

				// Setup seed
				const categoryRepo = manager.getRepository(Category);
				const categoryOne = categoryRepo.create({ id: 1 });
				const categoryTwo = categoryRepo.create({ id: 2 });
				const productOneId = 1;
				const productTwoId = 2;
				await categoryRepo.save(categoryOne);
				await categoryRepo.save(categoryTwo);
				const options = (id: number) =>
					({
						relationLoadStrategy: 'query',
						where: { id },
						relations: { categories: true },
					}) as FindManyOptions<Product>;

				// Create a custom repository that uses a query builder without query planner
				// For both methods, relationLoadStrategy is set to "query", where the bug lies.
				const productRepo = dataSource.getRepository(Product).extend({
					async getOne() {
						return this.createQueryBuilder('product')
							.setFindOptions(options(productOneId))
							.getOne();
					},

					async getMany() {
						return this.createQueryBuilder('product')
							.setFindOptions(options(productTwoId))
							.getMany();
					},
				});

				// Creates a transaction that is shared across all the queries
				const getOneProduct = await manager.transaction(async (txnManager) => {
					const customProductRepo = txnManager.withRepository(productRepo);
					const product = customProductRepo.create({
						id: productOneId,
						categories: [{ id: categoryOne.id }],
					});

					await customProductRepo.save(product);
					return await customProductRepo.getOne();
				});

				expect(getOneProduct?.categories.length).to.be.eql(1);

				const getManyProduct = await manager.transaction(async (txnManager) => {
					const customProductRepo = txnManager.withRepository(productRepo);
					const product = customProductRepo.create({
						id: productTwoId,
						categories: [{ id: categoryOne.id }, { id: categoryTwo.id }],
					});

					await customProductRepo.save(product);
					return await customProductRepo.getMany();
				});

				expect(getManyProduct[0].categories.length).to.be.eql(2);
			}),
		);
	});
});
