import 'reflect-metadata';
import { Category } from './entity/Category';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('github issues > #9534 materialized-path', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Category],
				// logging: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('attach should work properly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const a1 = new Category();
				a1.name = 'a1';
				a1.uid = 'a1';
				await categoryRepository.save(a1);

				const a11 = new Category();
				a11.name = 'a11';
				a11.uid = 'a11';
				a11.parentCategory = a1;
				await categoryRepository.save(a11);

				const a111 = new Category();
				a111.name = 'a111';
				a111.uid = 'a111';
				a111.parentCategory = a11;
				await categoryRepository.save(a111);

				const a12 = new Category();
				a12.name = 'a12';
				a12.uid = 'a12';
				a12.parentCategory = a1;
				await categoryRepository.save(a12);
				// normal part
				{
					const rootCategories = await categoryRepository.findRoots();
					rootCategories.should.be.eql([
						{
							id: 1,
							name: 'a1',
							uid: 'a1',
							parentUid: null,
						},
					]);

					const a11Parent = await categoryRepository.findAncestors(a11);
					a11Parent.length.should.be.equal(2);
					a11Parent.should.deep.include({
						id: 1,
						name: 'a1',
						uid: 'a1',
						parentUid: null,
					});
					a11Parent.should.deep.include({
						id: 2,
						name: 'a11',
						uid: 'a11',
						parentUid: 'a1',
					});

					const a1Children = await categoryRepository.findDescendants(a1);
					a1Children.length.should.be.equal(4);
					a1Children.should.deep.include({
						id: 1,
						name: 'a1',
						uid: 'a1',
						parentUid: null,
					});
					a1Children.should.deep.include({
						id: 2,
						name: 'a11',
						uid: 'a11',
						parentUid: 'a1',
					});
					a1Children.should.deep.include({
						id: 3,
						name: 'a111',
						uid: 'a111',
						parentUid: 'a11',
					});
					a1Children.should.deep.include({
						id: 4,
						name: 'a12',
						uid: 'a12',
						parentUid: 'a1',
					});
				}

				a111.parentCategory = null;
				await categoryRepository.save(a111);

				const rootCategories = await categoryRepository.findRoots();
				rootCategories.should.be.eql([
					{
						id: 1,
						name: 'a1',
						uid: 'a1',
						parentUid: null,
					},
					{
						id: 3,
						name: 'a111',
						uid: 'a111',
						parentUid: null,
					},
				]);

				const a11Parent = await categoryRepository.findAncestors(a11);
				a11Parent.length.should.be.equal(2);
				a11Parent.should.deep.include({
					id: 1,
					name: 'a1',
					uid: 'a1',
					parentUid: null,
				});
				a11Parent.should.deep.include({
					id: 2,
					name: 'a11',
					uid: 'a11',
					parentUid: 'a1',
				});

				const a1Children = await categoryRepository.findDescendants(a1);
				a1Children.length.should.be.equal(3);
				a1Children.should.deep.include({
					id: 1,
					name: 'a1',
					uid: 'a1',
					parentUid: null,
				});
				a1Children.should.deep.include({
					id: 2,
					name: 'a11',
					uid: 'a11',
					parentUid: 'a1',
				});
				a1Children.should.deep.include({
					id: 4,
					name: 'a12',
					uid: 'a12',
					parentUid: 'a1',
				});
			}),
		));
	it('findTrees() tests > findTrees should load all category roots', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const a1 = new Category();
				a1.name = 'a1';
				a1.uid = 'a1';

				const a11 = new Category();
				a11.name = 'a11';
				a11.uid = 'a11';

				const a12 = new Category();
				a12.name = 'a12';
				a12.uid = 'a12';

				const a111 = new Category();
				a111.name = 'a111';
				a111.uid = 'a111';

				const a112 = new Category();
				a112.name = 'a112';
				a112.uid = 'a112';

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
						uid: 'a1',
						parentUid: null,
						childCategories: [
							{
								id: a11.id,
								name: 'a11',
								uid: 'a11',
								parentUid: 'a1',
								childCategories: [
									{
										id: a111.id,
										name: 'a111',
										uid: 'a111',
										parentUid: 'a11',
										childCategories: [],
									},
									{
										id: a112.id,
										name: 'a112',
										uid: 'a112',
										parentUid: 'a11',
										childCategories: [],
									},
								],
							},
							{
								id: a12.id,
								name: 'a12',
								uid: 'a12',
								parentUid: 'a1',
								childCategories: [],
							},
						],
					},
				]);
			}),
		));
});
