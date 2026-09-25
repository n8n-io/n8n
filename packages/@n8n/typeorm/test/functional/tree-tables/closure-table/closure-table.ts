import 'reflect-metadata';
import { Category } from './entity/Category';
import { DataSource } from '../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';

describe('tree tables > closure-table', () => {
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
				a11Parent.length.should.be.equal(2);
				a11Parent.should.deep.include({ id: 1, name: 'a1' });
				a11Parent.should.deep.include({ id: 2, name: 'a11' });

				const a1Children = await categoryRepository.findDescendants(a1);
				a1Children.length.should.be.equal(3);
				a1Children.should.deep.include({ id: 1, name: 'a1' });
				a1Children.should.deep.include({ id: 2, name: 'a11' });
				a1Children.should.deep.include({ id: 3, name: 'a12' });
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
				a11Parent.length.should.be.equal(2);
				a11Parent.should.deep.include({ id: 1, name: 'a1' });
				a11Parent.should.deep.include({ id: 2, name: 'a11' });

				const a1Children = await categoryRepository.findDescendants(a1);
				a1Children.length.should.be.equal(3);
				a1Children.should.deep.include({ id: 1, name: 'a1' });
				a1Children.should.deep.include({ id: 2, name: 'a11' });
				a1Children.should.deep.include({ id: 3, name: 'a12' });
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
				a11Parent.length.should.be.equal(2);
				a11Parent.should.deep.include({ id: 1, name: 'a1' });
				a11Parent.should.deep.include({ id: 2, name: 'a11' });

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

	it('findTrees() tests > findTrees should load all category roots and attached children', () =>
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

				const categoriesTree = await categoryRepository.findTrees();

				// using sort because some drivers returns arrays in wrong order
				categoriesTree[0].childCategories.sort((a, b) => a.id - b.id);
				categoriesTree[0].childCategories[0].childCategories.sort((a, b) => a.id - b.id);

				categoriesTree.should.be.eql([
					{
						id: a1.id,
						name: 'a1',
						childCategories: [
							{
								id: a11.id,
								name: 'a11',
								childCategories: [
									{
										id: a111.id,
										name: 'a111',
										childCategories: [],
									},
									{
										id: a112.id,
										name: 'a112',
										childCategories: [],
									},
								],
							},
							{
								id: a12.id,
								name: 'a12',
								childCategories: [],
							},
						],
					},
				]);
			}),
		));

	it('findTrees() tests > findTrees should load multiple category roots if they exist', () =>
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

				const b1 = new Category();
				b1.name = 'b1';

				const b11 = new Category();
				b11.name = 'b11';

				const b12 = new Category();
				b12.name = 'b12';

				b1.childCategories = [b11, b12];
				await categoryRepository.save(b1);

				const categoriesTree = await categoryRepository.findTrees();

				// using sort because some drivers returns arrays in wrong order
				categoriesTree[0].childCategories.sort((a, b) => a.id - b.id);
				categoriesTree[0].childCategories[0].childCategories.sort((a, b) => a.id - b.id);
				categoriesTree[1].childCategories.sort((a, b) => a.id - b.id);
				categoriesTree[1].childCategories[0].childCategories.sort((a, b) => a.id - b.id);

				categoriesTree.should.be.eql([
					{
						id: a1.id,
						name: 'a1',
						childCategories: [
							{
								id: a11.id,
								name: 'a11',
								childCategories: [
									{
										id: a111.id,
										name: 'a111',
										childCategories: [],
									},
									{
										id: a112.id,
										name: 'a112',
										childCategories: [],
									},
								],
							},
							{
								id: a12.id,
								name: 'a12',
								childCategories: [],
							},
						],
					},
					{
						id: b1.id,
						name: 'b1',
						childCategories: [
							{
								id: b11.id,
								name: 'b11',
								childCategories: [],
							},
							{
								id: b12.id,
								name: 'b12',
								childCategories: [],
							},
						],
					},
				]);
			}),
		));

	it('findTrees() tests > findTrees should filter by depth if optionally provided', () =>
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

				const categoriesTree = await categoryRepository.findTrees();

				// using sort because some drivers returns arrays in wrong order
				categoriesTree[0].childCategories.sort((a, b) => a.id - b.id);
				categoriesTree[0].childCategories[0].childCategories.sort((a, b) => a.id - b.id);

				categoriesTree.should.be.eql([
					{
						id: a1.id,
						name: 'a1',
						childCategories: [
							{
								id: a11.id,
								name: 'a11',
								childCategories: [
									{
										id: a111.id,
										name: 'a111',
										childCategories: [],
									},
									{
										id: a112.id,
										name: 'a112',
										childCategories: [],
									},
								],
							},
							{
								id: a12.id,
								name: 'a12',
								childCategories: [],
							},
						],
					},
				]);

				const categoriesTreeWithEmptyOptions = await categoryRepository.findTrees({});

				// using sort because some drivers returns arrays in wrong order
				categoriesTreeWithEmptyOptions[0].childCategories.sort((a, b) => a.id - b.id);
				categoriesTreeWithEmptyOptions[0].childCategories[0].childCategories.sort(
					(a, b) => a.id - b.id,
				);

				categoriesTreeWithEmptyOptions.should.be.eql([
					{
						id: a1.id,
						name: 'a1',
						childCategories: [
							{
								id: a11.id,
								name: 'a11',
								childCategories: [
									{
										id: a111.id,
										name: 'a111',
										childCategories: [],
									},
									{
										id: a112.id,
										name: 'a112',
										childCategories: [],
									},
								],
							},
							{
								id: a12.id,
								name: 'a12',
								childCategories: [],
							},
						],
					},
				]);

				const categoriesTreeWithDepthZero = await categoryRepository.findTrees({ depth: 0 });
				categoriesTreeWithDepthZero.should.be.eql([
					{
						id: a1.id,
						name: 'a1',
						childCategories: [],
					},
				]);

				const categoriesTreeWithDepthOne = await categoryRepository.findTrees({ depth: 1 });

				// using sort because some drivers returns arrays in wrong order
				categoriesTreeWithDepthOne[0].childCategories[0].childCategories.sort(
					(a, b) => a.id - b.id,
				);

				categoriesTreeWithDepthOne.should.be.eql([
					{
						id: a1.id,
						name: 'a1',
						childCategories: [
							{
								id: a11.id,
								name: 'a11',
								childCategories: [],
							},
							{
								id: a12.id,
								name: 'a12',
								childCategories: [],
							},
						],
					},
				]);
			}),
		));

	it('findDescendantsTree() tests > findDescendantsTree should load all category descendents and nested children', () =>
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

				const categoriesTree = await categoryRepository.findDescendantsTree(a1);

				// using sort because some drivers returns arrays in wrong order
				categoriesTree.childCategories.sort((a, b) => a.id - b.id);
				categoriesTree.childCategories[0].childCategories.sort((a, b) => a.id - b.id);

				categoriesTree.should.be.eql({
					id: a1.id,
					name: 'a1',
					childCategories: [
						{
							id: a11.id,
							name: 'a11',
							childCategories: [
								{
									id: a111.id,
									name: 'a111',
									childCategories: [],
								},
								{
									id: a112.id,
									name: 'a112',
									childCategories: [],
								},
							],
						},
						{
							id: a12.id,
							name: 'a12',
							childCategories: [],
						},
					],
				});
			}),
		));

	it('findDescendantsTree() tests > findDescendantsTree should filter by depth if optionally provided', () =>
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

				const categoriesTree = await categoryRepository.findDescendantsTree(a1);

				// using sort because some drivers returns arrays in wrong order
				categoriesTree.childCategories.sort((a, b) => a.id - b.id);
				categoriesTree.childCategories[0].childCategories.sort((a, b) => a.id - b.id);

				categoriesTree.should.be.eql({
					id: a1.id,
					name: 'a1',
					childCategories: [
						{
							id: a11.id,
							name: 'a11',
							childCategories: [
								{
									id: a111.id,
									name: 'a111',
									childCategories: [],
								},
								{
									id: a112.id,
									name: 'a112',
									childCategories: [],
								},
							],
						},
						{
							id: a12.id,
							name: 'a12',
							childCategories: [],
						},
					],
				});

				const categoriesTreeWithEmptyOptions = await categoryRepository.findDescendantsTree(a1, {});

				// using sort because some drivers returns arrays in wrong order
				categoriesTreeWithEmptyOptions.childCategories.sort((a, b) => a.id - b.id);
				categoriesTreeWithEmptyOptions.childCategories[0].childCategories.sort(
					(a, b) => a.id - b.id,
				);

				categoriesTreeWithEmptyOptions.should.be.eql({
					id: a1.id,
					name: 'a1',
					childCategories: [
						{
							id: a11.id,
							name: 'a11',
							childCategories: [
								{
									id: a111.id,
									name: 'a111',
									childCategories: [],
								},
								{
									id: a112.id,
									name: 'a112',
									childCategories: [],
								},
							],
						},
						{
							id: a12.id,
							name: 'a12',
							childCategories: [],
						},
					],
				});

				const categoriesTreeWithDepthZero = await categoryRepository.findDescendantsTree(a1, {
					depth: 0,
				});
				categoriesTreeWithDepthZero.should.be.eql({
					id: a1.id,
					name: 'a1',
					childCategories: [],
				});

				const categoriesTreeWithDepthOne = await categoryRepository.findDescendantsTree(a1, {
					depth: 1,
				});

				// using sort because some drivers returns arrays in wrong order
				categoriesTreeWithDepthOne.childCategories.sort((a, b) => a.id - b.id);

				categoriesTreeWithDepthOne.should.be.eql({
					id: a1.id,
					name: 'a1',
					childCategories: [
						{
							id: a11.id,
							name: 'a11',
							childCategories: [],
						},
						{
							id: a12.id,
							name: 'a12',
							childCategories: [],
						},
					],
				});
			}),
		));
});
