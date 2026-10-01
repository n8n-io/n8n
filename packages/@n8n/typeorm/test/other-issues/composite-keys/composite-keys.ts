import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Policy } from './entity/Policy';
import { Group } from './entity/Group';
import { PolicyGroup } from './entity/PolicyGroup';

describe("other issues > composite keys doesn't work as expected in 0.3 compared to 0.2", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should properly save new relation items', () =>
		Promise.all(
			connections.map(async function (connection) {
				const group1 = new Group();
				group1.id = 1;
				const group2 = new Group();
				group2.id = 2;

				const policy1 = new Policy();
				policy1.id = 1;
				const policy2 = new Policy();
				policy2.id = 2;

				await connection.manager.save([group1, group2, policy1, policy2]);

				const policyGroup1 = new PolicyGroup();
				policyGroup1.groupId = group1.id;
				policyGroup1.policyId = policy1.id;

				await connection.manager.save([policyGroup1]);

				// re-load policy
				const loadedPolicy = await connection.manager.getRepository(Policy).findOneOrFail({
					where: { id: 1 },
					loadEagerRelations: false,
				});

				const loadedPolicyGroups = await connection.manager.getRepository(PolicyGroup).find({
					where: {
						policyId: loadedPolicy.id,
					},
					loadEagerRelations: false,
				});

				const policyGroups2 = new PolicyGroup();
				policyGroups2.groupId = group2.id;
				policyGroups2.policyId = policy1.id;

				loadedPolicy.groups = [...loadedPolicyGroups, policyGroups2];

				await connection.manager.save(loadedPolicy);
			}),
		));

	it('should properly save new relation items - Drata', async () => {
		for (const connection of connections) {
			let policy = new Policy();
			policy.id = 1;

			const group = new Group();
			group.id = 1;

			let policyGroup = new PolicyGroup();
			policyGroup.policy = policy;
			policyGroup.group = group;

			await connection.manager.save(policy);
			await connection.manager.save(group);
			await connection.manager.save(policyGroup);

			/**
			 * Query everything back out to start fresh
			 */
			policy = await connection.manager.findOneByOrFail(Policy, {});
			policyGroup = await connection.manager.findOneByOrFail(PolicyGroup, {});

			policy.groups = [policyGroup];

			/**
			 * This save fails
			 */
			await connection.manager.save(policy);
		}
	});
});
