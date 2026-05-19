import 'reflect-metadata';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Group } from './entity/Group';

describe('github issues > #1089 UUID in ClosureEntity', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: false,
				dropSchema: true,
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should correctly work with primary UUID column', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.synchronize();

				const queryRunner = connection.createQueryRunner();
				const table = await queryRunner.getTable('group');
				await queryRunner.release();

				table!.should.exist;

				const groupRepository = connection.getTreeRepository(Group);

				const a1 = new Group();
				a1.name = 'a1';
				await groupRepository.save(a1);

				const a11 = new Group();
				a11.name = 'a11';
				a11.parent = a1;
				await groupRepository.save(a11);

				const a12 = new Group();
				a12.name = 'a12';
				a12.parent = a1;
				await groupRepository.save(a12);

				const rootGroups = await groupRepository.findRoots();
				rootGroups.length.should.be.equal(1);

				const a11Parent = await groupRepository.findAncestors(a11);
				a11Parent.length.should.be.equal(2);

				const a1Children = await groupRepository.findDescendants(a1);
				a1Children.length.should.be.equal(3);
			}),
		));
});
