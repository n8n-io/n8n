import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Category } from './entity/Category';
import { Site } from './entity/Site';

describe('github issues > #7974 Adding relations option to findTrees()', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Category, Site],
				schemaCreate: true,
				dropSchema: true,
				// TODO: Seems to be broken with sqlite and "relationLoadStrategy": "query"
				disabledDrivers: ['sqlite-pooled'],
			})),
	);

	beforeEach(async () => {
		await reloadTestingDatabases(connections);
		for (let connection of connections) {
			let categoryRepo = connection.getRepository(Category);
			let siteRepo = connection.getRepository(Site);

			let c1: Category = new Category();
			c1.title = 'Category 1';
			c1.parentCategory = null;
			c1.childCategories = [];
			c1.sites = [];

			let c2: Category = new Category();
			c2.title = 'Category 2';
			c2.parentCategory = null;
			c2.childCategories = [];
			c2.sites = [];

			let c3: Category = new Category();
			c3.title = 'Category 1.1';
			c3.parentCategory = c1;
			c3.childCategories = [];
			c3.sites = [];

			let c4: Category = new Category();
			c4.title = 'Category 1.1.1';
			c4.parentCategory = c3;
			c4.childCategories = [];
			c4.sites = [];

			c1.childCategories = [c3];
			c3.childCategories = [c4];

			let s1: Site = new Site();
			s1.title = 'Site of Category 1';
			s1.parentCategory = c1;

			let s2: Site = new Site();
			s2.title = 'Site of Category 1';
			s2.parentCategory = c1;

			let s3: Site = new Site();
			s3.title = 'Site of Category 1.1';
			s3.parentCategory = c3;

			let s4: Site = new Site();
			s4.title = 'Site of Category 1.1';
			s4.parentCategory = c3;

			let s5: Site = new Site();
			s5.title = 'Site of Category 1.1.1';
			s5.parentCategory = c4;

			// Create the categories
			await categoryRepo.save(c1);
			await categoryRepo.save(c2);
			await categoryRepo.save(c3);
			await categoryRepo.save(c4);

			// Create the sites

			await siteRepo.save(s1);
			await siteRepo.save(s2);
			await siteRepo.save(s3);
			await siteRepo.save(s4);
			await siteRepo.save(s5);

			// Set the just created relations correctly
			c1.sites = [s1, s2];
			c2.sites = [];
			c3.sites = [s3, s4];
			c4.sites = [s5];
		}
	});

	after(() => closeTestingConnections(connections));

	it('should return tree without sites relations', async () =>
		await Promise.all(
			connections.map(async (connection) => {
				let result = await connection.getTreeRepository(Category).findTrees();

				// The complete tree should exist but other relations than the parent- / child-relations should not be loaded
				expect(result).to.have.lengthOf(2);
				expect(result[0].sites).equals(undefined);
				expect(result[0].childCategories).to.have.lengthOf(1);
				expect(result[0].childCategories[0].childCategories).to.have.lengthOf(1);
				expect(result[0].childCategories[0].childCategories[0].sites).equal(undefined);
			}),
		));

	it('should return tree with sites relations', async () =>
		await Promise.all(
			connections.map(async (connection) => {
				let result = await connection
					.getTreeRepository(Category)
					.findTrees({ relations: ['sites'] });

				// The complete tree should exist and site relations should not be loaded for every category
				expect(result).to.have.lengthOf(2);
				expect(result[0].sites).lengthOf(2);
				expect(result[1].sites).to.be.an('array');
				expect(result[1].sites).to.have.lengthOf(0);
				expect(result[0].childCategories[0].sites).to.have.lengthOf(2);
				expect(result[0].childCategories[0].childCategories[0].sites).to.have.lengthOf(1);
				expect(result[0].childCategories[0].childCategories[0].sites).to.be.an('array');
				expect(result[0].childCategories[0].childCategories[0].sites[0].title).to.be.equal(
					'Site of Category 1.1.1',
				);
			}),
		));
});
