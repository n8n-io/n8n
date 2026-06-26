import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { expect } from 'chai';

import { Category, Product } from './entity';

describe('github issues > #10431 When requesting nested relations on foreign key primary entities, relation becomes empty entity rather than null', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Category, Product],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should return [] when requested nested relations are empty on ManyToMany relation with @VirtualColumn definitions', () =>
		Promise.all(
			connections.map(async (connection) => {
				const productRepo = connection.getRepository(Product);
				const testProduct = new Product();
				testProduct.name = 'foo';
				await productRepo.save(testProduct);
				const foundProduct = await productRepo.findOne({
					where: {
						id: testProduct.id,
					},
					relations: { categories: true },
				});
				expect(foundProduct?.name).eq('foo');
				expect(foundProduct?.categories).eql([]);
			}),
		));
});
