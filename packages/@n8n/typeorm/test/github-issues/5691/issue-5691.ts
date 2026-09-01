import '../../utils/test-setup';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { Child1 } from './enity/Child1';
import { Child2 } from './enity/Child2';
import { Root } from './enity/Root';
import { Shared } from './enity/Shared';

describe('github issues > #5691 RelationId is too slow', () => {
	const setupFixtures = async (connection: DataSource, allChild2: Array<Child2>): Promise<void> => {
		const root = new Root();
		root.allChild2 = allChild2;
		await connection.getRepository(Root).save(root);

		const rootAllShared: Array<Shared> = [];
		for (let indexShared = 0; indexShared < allChild2.length; indexShared++) {
			const rootShared = new Shared();
			rootShared.root = root;
			rootAllShared.push(rootShared);
		}
		await connection.getRepository(Shared).save(rootAllShared);

		for (let indexChild1 = 0; indexChild1 < allChild2.length; indexChild1++) {
			const rootChild1 = new Child1();
			rootChild1.root = root;
			await connection.getRepository(Child1).save(rootChild1);

			for (const child2 of allChild2) {
				const rootChild1Child2 = new Shared();
				rootChild1Child2.root = root;
				rootChild1Child2.child1 = rootChild1;
				rootChild1Child2.child2 = child2;
				await connection.getRepository(Shared).save(rootChild1Child2);
			}
			for (const shared of rootAllShared) {
				const rootChild1Shared = new Shared();
				rootChild1Shared.root = root;
				rootChild1Shared.child1 = rootChild1;
				rootChild1Shared.shared = shared;
				await connection.getRepository(Shared).save(rootChild1Shared);
			}
		}
	};

	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Root, Child1, Child2, Shared],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should be as fast as separate queries', () =>
		Promise.all(
			connections.map(async (connection) => {
				const child21 = new Child2();
				const child22 = new Child2();
				const child23 = new Child2();
				const child24 = new Child2();
				const child25 = new Child2();

				await connection.getRepository(Child2).save(child21);
				await connection.getRepository(Child2).save(child22);
				await connection.getRepository(Child2).save(child23);
				await connection.getRepository(Child2).save(child24);
				await connection.getRepository(Child2).save(child25);

				await setupFixtures(connection, [child21, child22, child23]);
				// To understand the problem deeper add more fixtures.
				// It will take forever.
				// await setupFixtures(connection, [child22, child23, child24]),
				// await setupFixtures(connection, [child23, child24, child25]),
				// await setupFixtures(connection, [child24, child25, child21]),
				// await setupFixtures(connection, [child25, child21, child22]),
				// await setupFixtures(connection, [child21, child22, child23]),
				// await setupFixtures(connection, [child22, child23, child24]),
				// await setupFixtures(connection, [child23, child24, child25]),
				// await setupFixtures(connection, [child24, child25, child21]),
				// await setupFixtures(connection, [child25, child21, child22]),

				// const test1Start = new Date().getTime();
				// 54 rows for 1 root
				await connection.getRepository(Root).find({
					relations: {
						allChild1: {
							allShared: true,
						},
						allChild2: true,
					},
				});
				// 21 rows 1 root
				await connection.getRepository(Root).find({
					relations: { allShared: true },
				});
				// const test1End = new Date().getTime();

				// const test2Start = new Date().getTime();
				// 1134 rows 1 root
				await connection.getRepository(Root).find({
					relations: {
						allChild1: {
							allShared: true,
						},
						allChild2: true,
						allShared: true,
					},
				});
				// const test2End = new Date().getTime();

				// TODO: this test is really weird. results can be different on different machines and we had tests failed multiple times due to this check
				// expect(test2End - test2Start).to.be.lessThan(
				//     (test1End - test1Start) * 15, // yes, even 15 times slower, because amount of data requires more time.
				//     "a single call should be not as more as 15 times slower than multi calls",
				// );
			}),
		));
});
