import 'reflect-metadata';
import { Category } from './entity/Category';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../test/utils/test-utils';

describe('github issues > #6947 Custom primary column for TreeRepository based entities unable to get tree descendants', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Category],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('entities with custom primary column names should work', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const parent = new Category();
				parent.cat_name = 'parent';
				await categoryRepository.save(parent);

				const child = new Category();
				child.cat_name = 'child';
				child.parent = parent;
				await categoryRepository.save(child);

				const tree = await categoryRepository.findDescendantsTree(
					(await categoryRepository.findOneBy({
						cat_name: 'parent',
					}))!,
				);

				tree.should.deep.include({
					cat_id: 1,
					cat_name: 'parent',
					children: [
						{
							cat_id: 2,
							cat_name: 'child',
							children: [],
						},
					],
				});
			}),
		));
});
