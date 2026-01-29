import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import { PolicyProjectAssignment } from '../entities';

@Service()
export class PolicyProjectAssignmentRepository extends Repository<PolicyProjectAssignment> {
	constructor(dataSource: DataSource) {
		super(PolicyProjectAssignment, dataSource.manager);
	}

	async findByPolicyId(policyId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(PolicyProjectAssignment, {
			where: { policyId },
			relations: ['project'],
		});
	}

	async findByProjectId(projectId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(PolicyProjectAssignment, {
			where: { projectId },
			relations: ['policy'],
		});
	}

	async createAssignments(policyId: string, projectIds: string[], entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		const assignments = projectIds.map((projectId) =>
			em.create(PolicyProjectAssignment, { policyId, projectId }),
		);
		return await em.save(PolicyProjectAssignment, assignments);
	}

	async deleteByPolicyId(policyId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.delete(PolicyProjectAssignment, { policyId });
	}

	async replaceAssignments(policyId: string, projectIds: string[], entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;

		// Delete existing assignments
		await em.delete(PolicyProjectAssignment, { policyId });

		// Create new assignments if any
		if (projectIds.length > 0) {
			return await this.createAssignments(policyId, projectIds, em);
		}

		return [];
	}
}
