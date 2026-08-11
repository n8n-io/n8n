import '../../utils/test-setup';
import { Category } from './entity/Category';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('github issues > #7068', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Category],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('categories should be attached via parent and saved properly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const a1 = new Category();
				a1.name = 'a1';
				await categoryRepository.save(a1);

				const a11 = new Category();
				a11.name = 'a11';
				a11.parentCategory = a1;
				await categoryRepository.save(a11);

				const a12 = new Category();
				a12.name = 'a12';
				a12.parentCategory = a1;
				await categoryRepository.save(a12);

				const rootCategories = await categoryRepository.findRoots();
				rootCategories.should.be.eql([
					{
						id: 1,
						name: 'a1',
					},
				]);

				const a11Parent = await categoryRepository.findAncestors(a11);
				const names1 = a11Parent.map((child) => child.name);
				names1.length.should.be.equal(2);
				names1.should.deep.include('a1');
				names1.should.deep.include('a11');

				const a1Children = await categoryRepository.findDescendants(a1);
				const names2 = a1Children.map((child) => child.name);
				names2.length.should.be.equal(3);
				names2.should.deep.include('a1');
				names2.should.deep.include('a11');
				names2.should.deep.include('a12');
			}),
		));

	it('categories should be attached via children and saved properly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const a1 = new Category();
				a1.name = 'a1';
				await categoryRepository.save(a1);

				const a11 = new Category();
				a11.name = 'a11';

				const a12 = new Category();
				a12.name = 'a12';

				a1.childCategories = [a11, a12];
				await categoryRepository.save(a1);

				const rootCategories = await categoryRepository.findRoots();
				rootCategories.should.be.eql([
					{
						id: 1,
						name: 'a1',
					},
				]);

				const a11Parent = await categoryRepository.findAncestors(a11);
				const names1 = a11Parent.map((child) => child.name);
				names1.length.should.be.equal(2);
				names1.should.deep.include('a1');
				names1.should.deep.include('a11');

				const a1Children = await categoryRepository.findDescendants(a1);
				const names2 = a1Children.map((child) => child.name);
				names2.length.should.be.equal(3);
				names2.should.deep.include('a1');
				names2.should.deep.include('a11');
				names2.should.deep.include('a12');
			}),
		));

	it('categories should be attached via children and saved properly and everything must be saved in cascades', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const a1 = new Category();
				a1.name = 'a1';

				const a11 = new Category();
				a11.name = 'a11';

				const a12 = new Category();
				a12.name = 'a12';

				const a111 = new Category();
				a111.name = 'a111';

				const a112 = new Category();
				a112.name = 'a112';

				a1.childCategories = [a11, a12];
				a11.childCategories = [a111, a112];
				await categoryRepository.save(a1);

				const rootCategories = await categoryRepository.findRoots();
				rootCategories.should.be.eql([
					{
						id: 1,
						name: 'a1',
					},
				]);

				const a11Parent = await categoryRepository.findAncestors(a11);
				const names1 = a11Parent.map((child) => child.name);
				names1.length.should.be.equal(2);
				names1.should.deep.include('a1');
				names1.should.deep.include('a11');

				const a1Children = await categoryRepository.findDescendants(a1);
				const a1ChildrenNames = a1Children.map((child) => child.name);
				a1ChildrenNames.length.should.be.equal(5);
				a1ChildrenNames.should.deep.include('a1');
				a1ChildrenNames.should.deep.include('a11');
				a1ChildrenNames.should.deep.include('a12');
				a1ChildrenNames.should.deep.include('a111');
				a1ChildrenNames.should.deep.include('a112');
			}),
		));

	// todo: finish implementation and implement on other trees
	it.skip('categories should remove removed children', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const a1 = new Category();
				a1.name = 'a1';
				const a11 = new Category();
				a11.name = 'a11';
				const a12 = new Category();
				a12.name = 'a12';
				a1.childCategories = [a11, a12];
				await categoryRepository.save(a1);

				const a1Children1 = await categoryRepository.findDescendants(a1);
				const a1ChildrenNames1 = a1Children1.map((child) => child.name);
				a1ChildrenNames1.length.should.be.equal(3);
				a1ChildrenNames1.should.deep.include('a1');
				a1ChildrenNames1.should.deep.include('a11');
				a1ChildrenNames1.should.deep.include('a12');

				// a1.childCategories = [a11];
				// await categoryRepository.save(a1);
				//
				// const a1Children2 = await categoryRepository.findDescendants(a1);
				// const a1ChildrenNames2 = a1Children2.map(child => child.name);
				// a1ChildrenNames2.length.should.be.equal(3);
				// a1ChildrenNames2.should.deep.include("a1");
				// a1ChildrenNames2.should.deep.include("a11");
				// a1ChildrenNames2.should.deep.include("a12");
			}),
		));

	// todo: finish implementation and implement on other trees
	it.skip('sub-category should be removed with all its children', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const a1 = new Category();
				a1.name = 'a1';
				const a11 = new Category();
				a11.name = 'a11';
				const a12 = new Category();
				a12.name = 'a12';
				a1.childCategories = [a11, a12];
				await categoryRepository.save(a1);

				const a1Children1 = await categoryRepository.findDescendants(a1);
				const a1ChildrenNames1 = a1Children1.map((child) => child.name);
				a1ChildrenNames1.length.should.be.equal(3);
				a1ChildrenNames1.should.deep.include('a1');
				a1ChildrenNames1.should.deep.include('a11');
				a1ChildrenNames1.should.deep.include('a12');

				await categoryRepository.remove(a1);

				// a1.childCategories = [a11];
				// await categoryRepository.save(a1);
				//
				// const a1Children2 = await categoryRepository.findDescendants(a1);
				// const a1ChildrenNames2 = a1Children2.map(child => child.name);
				// a1ChildrenNames2.length.should.be.equal(3);
				// a1ChildrenNames2.should.deep.include("a1");
				// a1ChildrenNames2.should.deep.include("a11");
				// a1ChildrenNames2.should.deep.include("a12");
			}),
		));
});
