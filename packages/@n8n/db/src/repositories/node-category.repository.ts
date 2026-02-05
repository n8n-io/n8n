import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import { NodeCategory } from '../entities';

@Service()
export class NodeCategoryRepository extends Repository<NodeCategory> {
	constructor(dataSource: DataSource) {
		super(NodeCategory, dataSource.manager);
	}

	async findBySlug(slug: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.findOne(NodeCategory, {
			where: { slug },
			relations: ['nodeAssignments', 'createdBy'],
		});
	}

	async findAllWithAssignments(entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeCategory, {
			relations: ['nodeAssignments', 'createdBy'],
			order: { displayName: 'ASC' },
		});
	}

	async createCategory(
		data: {
			slug: string;
			displayName: string;
			description?: string;
			color?: string;
			createdById: string;
		},
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		const category = em.create(NodeCategory, {
			slug: data.slug,
			displayName: data.displayName,
			description: data.description ?? null,
			color: data.color ?? null,
			createdById: data.createdById,
		});
		return await em.save(NodeCategory, category);
	}

	async updateCategory(
		id: string,
		data: Partial<{
			slug: string;
			displayName: string;
			description: string | null;
			color: string | null;
		}>,
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		await em.update(NodeCategory, { id }, data);
		return await em.findOne(NodeCategory, { where: { id } });
	}
}
