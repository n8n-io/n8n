import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Child } from './entity/Child';
import { Grandchild } from './entity/Grandchild';
import { Parent } from './entity/Parent';

describe('github issues > #8018 Non-unique relation property names causes entity mixup in query results', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Parent, Child, Grandchild],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(async () => await reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should create child entities of the correct type', async () =>
		await Promise.all(
			connections.map(async (connection) => {
				const parent = new Parent();
				parent.name = 'parent';

				const child1 = new Child();
				child1.name = 'child1';
				child1.parent = parent;

				const child2 = new Child();
				child2.name = 'child2';
				child2.parent = parent;

				await connection.manager.save([parent, child1, child2]);

				const result = await connection.manager.find(Parent, {
					relations: { children: true },
				});

				expect(result).to.have.lengthOf(1);
				expect(result[0].children).to.have.lengthOf(2);
				expect(result[0].children![0]).to.be.instanceOf(Child);
				expect(result[0].children![1]).to.be.instanceOf(Child);
			}),
		));
});
