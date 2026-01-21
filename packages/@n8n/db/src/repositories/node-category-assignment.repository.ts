import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { NodeCategoryAssignment } from '../entities';

@Service()
export class NodeCategoryAssignmentRepository extends Repository<NodeCategoryAssignment> {
	constructor(dataSource: DataSource) {
		super(NodeCategoryAssignment, dataSource.manager);
	}

	async findByCategoryId(categoryId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeCategoryAssignment, {
			where: { categoryId },
		});
	}

	async findByNodeType(nodeType: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeCategoryAssignment, {
			where: { nodeType },
			relations: ['category'],
		});
	}

	async findByNodeTypes(nodeTypes: string[], entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeCategoryAssignment, {
			where: { nodeType: In(nodeTypes) },
			relations: ['category'],
		});
	}

	async createAssignment(
		data: {
			categoryId: string;
			nodeType: string;
			assignedById: string;
		},
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		const assignment = em.create(NodeCategoryAssignment, data);
		return await em.save(NodeCategoryAssignment, assignment);
	}

	async createBulkAssignments(
		categoryId: string,
		nodeTypes: string[],
		assignedById: string,
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		const assignments = nodeTypes.map((nodeType) =>
			em.create(NodeCategoryAssignment, { categoryId, nodeType, assignedById }),
		);
		return await em.save(NodeCategoryAssignment, assignments);
	}

	async removeAssignment(categoryId: string, nodeType: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.delete(NodeCategoryAssignment, { categoryId, nodeType });
	}

	async getNodeTypeToCategories(entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		const assignments = await em.find(NodeCategoryAssignment, {
			relations: ['category'],
		});

		const map = new Map<string, string[]>();
		for (const assignment of assignments) {
			const existing = map.get(assignment.nodeType) ?? [];
			existing.push(assignment.category.slug);
			map.set(assignment.nodeType, existing);
		}
		return map;
	}
}
