import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
	generateRandomText,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Category } from './entity/category.entity';
import { TreeRepository } from '../../../src';

describe('github issues > #8556 TreeRepository.findDescendants/Tree should return empty if tree parent entity does not exist', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				dropSchema: true,
				schemaCreate: true,
				name: generateRandomText(10), // Use a different name to avoid a random failure in build pipeline
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load descendants when findDescendants is called for a tree entity', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo: TreeRepository<Category> = connection.getTreeRepository(Category);
				const root: Category = await repo.save({
					id: 1,
					name: 'root',
				} as Category);
				await repo.save({
					id: 2,
					name: 'child',
					parent: root,
				} as Category);
				const descendantsIncludingParent = await repo.findDescendants(root);
				expect(descendantsIncludingParent.length).to.be.equal(2);
				const descendantTree = await repo.findDescendantsTree(root);
				expect(descendantTree.children.length).to.be.equal(1);
				const countDescendantsIncludingParent = await repo.countDescendants(root);
				expect(countDescendantsIncludingParent).to.be.equal(2);
			}),
		));

	it('should return empty when findDescendants is called for a non existing tree entity', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo: TreeRepository<Category> = connection.getTreeRepository(Category);
				const root: Category = await repo.save({
					id: 1,
					name: 'root',
				} as Category);
				await repo.save({
					id: 2,
					name: 'child',
					parent: root,
				} as Category);
				const descendantsOfNonExistingParent = await repo.findDescendants({ id: -1 } as Category);
				expect(descendantsOfNonExistingParent.length).to.be.equal(0);
				const descendantTree = await repo.findDescendantsTree({
					id: -1,
				} as Category);
				expect(descendantTree.children.length).to.be.equal(0);
				const countDescendantsIncludingParent = await repo.countDescendants({ id: -1 } as Category);
				expect(countDescendantsIncludingParent).to.be.equal(0);
			}),
		));
});
