import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Category } from './entity/Category';

describe('github issues > #3783 Tree functionality broken', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const categoryRepository = connection.getTreeRepository(Category);

				const a1 = new Category();
				a1.name = 'a1';

				const b1 = new Category();
				b1.name = 'b1';

				const c1 = new Category();
				c1.name = 'c1';

				const c11 = new Category();
				c11.name = 'c11';

				const c12 = new Category();
				c12.name = 'c12';

				c11.parentCategory = c1;
				c12.parentCategory = c1;

				await categoryRepository.save(a1);
				await categoryRepository.save(b1);
				await categoryRepository.save(c1);
				await categoryRepository.save(c11);
				await categoryRepository.save(c12);

				const roots = await categoryRepository.findRoots();
				roots.length.should.be.eql(3);

				const c1Tree = await categoryRepository.findDescendantsTree(c1);
				c1Tree.should.be.equal(c1);
				c1Tree!.childCategories.length.should.be.eql(2);
			}),
		));
});
