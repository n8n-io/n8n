import { Service } from '@n8n/di';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { Brackets, DataSource, Repository } from '@n8n/typeorm';

import { Project } from '../entities';

@Service()
export class ProjectRepository extends Repository<Project> {
	constructor(dataSource: DataSource) {
		super(Project, dataSource.manager);
	}

	async getPersonalProjectForUser(userId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;

		return await em.findOne(Project, {
			where: {
				type: 'personal',
				creatorId: userId,
			},
			relations: ['projectRelations.role'],
		});
	}

	async getPersonalProjectForUserOrFail(userId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;

		return await em.findOneOrFail(Project, {
			where: {
				type: 'personal',
				creatorId: userId,
			},
		});
	}

	async getAccessibleProjects(userId: string) {
		return await this.find({
			where: {
				projectRelations: {
					userId,
				},
			},
		});
	}

	async findAllProjectsAndCount(options: ProjectListOptions): Promise<[Project[], number]> {
		const query = this.createQueryBuilder('project').leftJoin('project.creator', 'creator');

		this.applyFilters(query, options);
		this.applyActivationOrder(query);
		this.applyPagination(query, options);

		return await query.getManyAndCount();
	}

	async getAccessibleProjectsAndCount(
		userId: string,
		options: ProjectListOptions,
	): Promise<[Project[], number]> {
		const idsQuery = this.createQueryBuilder('p')
			.select('p.id', 'id')
			.innerJoin('p.projectRelations', 'pr')
			.where('pr.userId = :userId', { userId });

		if (options.search) {
			idsQuery.andWhere('LOWER(p.name) LIKE LOWER(:search)', {
				search: `%${options.search}%`,
			});
		}

		if (options.type) {
			idsQuery.andWhere('p.type = :type', { type: options.type });
		}

		if (options.activated === true) {
			idsQuery.leftJoin('p.creator', 'creator').andWhere(
				new Brackets((qb) => {
					qb.where('p.type != :personalTypeFilter', {
						personalTypeFilter: 'personal',
					}).orWhere('creator.password IS NOT NULL');
				}),
			);
		}

		const query = this.createQueryBuilder('project')
			.leftJoin('project.creator', 'creator')
			.where(`project.id IN (${idsQuery.getQuery()})`);
		query.setParameters(idsQuery.getParameters());

		// Sort: team projects first, then activated personal projects, then pending ones
		this.applyActivationOrder(query);
		this.applyPagination(query, options);

		return await query.getManyAndCount();
	}

	private applyFilters(query: SelectQueryBuilder<Project>, options: ProjectListOptions): void {
		if (options.search) {
			query.andWhere('LOWER(project.name) LIKE LOWER(:search)', {
				search: `%${options.search}%`,
			});
		}

		if (options.type) {
			query.andWhere('project.type = :type', { type: options.type });
		}

		if (options.activated === true) {
			query.andWhere(
				new Brackets((qb) => {
					qb.where('project.type != :personalTypeFilter', {
						personalTypeFilter: 'personal',
					}).orWhere('creator.password IS NOT NULL');
				}),
			);
		}
	}

	/**
	 * Sort: team projects first, then activated personal projects, then pending ones.
	 * Uses addSelect + alias so TypeORM doesn't try to parse the CASE as a property path.
	 * The `creator` relation must already be joined on the query.
	 */
	private applyActivationOrder(query: SelectQueryBuilder<Project>): void {
		query
			.addSelect(
				"CASE WHEN project.type != 'personal' THEN 0 WHEN creator.password IS NOT NULL THEN 1 ELSE 2 END",
				'activation_order',
			)
			.orderBy('activation_order', 'ASC')
			.addOrderBy('project.name', 'ASC');
	}

	private applyPagination(query: SelectQueryBuilder<Project>, options: ProjectListOptions): void {
		query.skip(options.skip ?? 0);
		if (options.take !== undefined) {
			query.take(options.take);
		}
	}

	async getProjectCounts() {
		return {
			personal: await this.count({ where: { type: 'personal' } }),
			team: await this.count({ where: { type: 'team' } }),
		};
	}
}

export interface ProjectListOptions {
	skip?: number;
	take?: number;
	search?: string;
	type?: 'personal' | 'team';
	activated?: boolean;
}
