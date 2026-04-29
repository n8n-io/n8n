import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';

import {
	NodeGovernancePolicy,
	type PolicyScope,
	type PolicyType,
	type TargetType,
} from '../entities';

@Service()
export class NodeGovernancePolicyRepository extends Repository<NodeGovernancePolicy> {
	constructor(dataSource: DataSource) {
		super(NodeGovernancePolicy, dataSource.manager);
	}

	async findByScope(scope: PolicyScope, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeGovernancePolicy, {
			where: { scope },
			relations: ['projectAssignments', 'createdBy'],
		});
	}

	async findByProjectIds(projectIds: string[], entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeGovernancePolicy, {
			where: {
				projectAssignments: {
					projectId: In(projectIds),
				},
			},
			relations: ['projectAssignments', 'createdBy'],
		});
	}

	async findGlobalPolicies(entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeGovernancePolicy, {
			where: { scope: 'global' },
			relations: ['createdBy'],
		});
	}

	async findPoliciesForNode(
		nodeType: string,
		categorySlug: string | undefined,
		projectIds: string[],
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;

		const queryBuilder = em
			.createQueryBuilder(NodeGovernancePolicy, 'policy')
			.leftJoinAndSelect('policy.projectAssignments', 'assignment')
			.leftJoinAndSelect('policy.createdBy', 'createdBy')
			.where('policy.targetType = :nodeType AND policy.targetValue = :nodeTypeValue', {
				nodeType: 'node' satisfies TargetType,
				nodeTypeValue: nodeType,
			});

		if (categorySlug) {
			queryBuilder.orWhere(
				'policy.targetType = :categoryType AND policy.targetValue = :categoryValue',
				{
					categoryType: 'category' satisfies TargetType,
					categoryValue: categorySlug,
				},
			);
		}

		return await queryBuilder.getMany();
	}

	async findAllWithRelations(entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeGovernancePolicy, {
			relations: ['projectAssignments', 'projectAssignments.project', 'createdBy'],
			order: { createdAt: 'DESC' },
		});
	}

	async createPolicy(
		data: {
			policyType: PolicyType;
			scope: PolicyScope;
			targetType: TargetType;
			targetValue: string;
			createdById: string;
		},
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		const policy = em.create(NodeGovernancePolicy, data);
		return await em.save(NodeGovernancePolicy, policy);
	}
}
