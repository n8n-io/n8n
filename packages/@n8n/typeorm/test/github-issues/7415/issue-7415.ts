import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Category } from './entity/Category';
import { Slug } from './entity/Slug';
import { expect } from 'chai';

describe('github issues > #7415 Tree entities with embedded primary columns are not built correctly', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should build tree entities with embedded primary columns correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const manager = connection.manager;

				const a1 = new Category('1');
				await manager.save(a1);

				const a2 = new Category('2');
				await manager.save(a2);

				const a11 = new Category('1.1', a1);
				await manager.save(a11);

				const a12 = new Category('1.2', a1);
				await manager.save(a12);

				const a13 = new Category('1.3', a1);
				await manager.save(a13);

				const a121 = new Category('1.2.1', a12);
				await manager.save(a121);

				const a122 = new Category('1.2.2', a12);
				await manager.save(a122);

				const repository = manager.getTreeRepository(Category);

				const descendantsTree = await repository.findDescendantsTree(a1);

				const expectedDescendantsTree = {
					id: new Slug('1'),
					children: [
						{ id: new Slug('1.1'), children: [] },
						{
							id: new Slug('1.2'),
							children: [
								{ id: new Slug('1.2.1'), children: [] },
								{ id: new Slug('1.2.2'), children: [] },
							],
						},
						{ id: new Slug('1.3'), children: [] },
					],
				};

				expect(descendantsTree.id).to.be.eql(expectedDescendantsTree.id);
				expect(descendantsTree.children).to.have.deep.members(expectedDescendantsTree.children);

				const ancestorsTree = await repository.findAncestorsTree(a121);

				const expectedAncestorsTree = {
					id: new Slug('1.2.1'),
					parent: {
						id: new Slug('1.2'),
						parent: { id: new Slug('1') },
					},
				};

				expect(ancestorsTree).to.be.eql(expectedAncestorsTree);
			}),
		));
});
