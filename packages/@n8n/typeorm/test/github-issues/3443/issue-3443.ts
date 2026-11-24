import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';

describe('github issues > #3443 @JoinTable on entities without synchronization', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('Should set synchronize: false for @JoinTable when passed to options', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const PRODUCT_TABLE_NAME = 'product';
				const CATEGORY_TABLE_NAME = 'category';
				const PRODUCT_CATEGORY_TABLE_NAME = 'product_category';

				expect(() => dataSource.getMetadata(PRODUCT_TABLE_NAME)).not.to.throw();
				expect(() => dataSource.getMetadata(CATEGORY_TABLE_NAME)).not.to.throw();
				expect(() => dataSource.getMetadata(PRODUCT_CATEGORY_TABLE_NAME)).not.to.throw();
				expect(dataSource.getMetadata(PRODUCT_CATEGORY_TABLE_NAME).synchronize).to.equal(false);
			}),
		));

	// you can add additional tests if needed
});
