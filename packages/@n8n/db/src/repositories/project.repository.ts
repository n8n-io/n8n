import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { Service } from '@n8n/di';
import { PROJECT_ADMIN_ROLE_SLUG, PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { Brackets, DataSource, In, Not } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import { Project, ProjectRelation, Role } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { chunkIds } from '../utils/chunk-ids';
import { isUniqueConstraintError } from '../utils/is-unique-constraint-error';

export class ProjectIdConflictError extends UserError {
	constructor() {
		super('A project with this ID already exists');
	}
}

@Service()
export class ProjectRepository extends BaseRepository<Project> {
	constructor(
		dataSource: DataSource,
		private readonly txRunner: TransactionRunner,
	) {
		super(Project, dataSource.manager, txRunner);
	}

	/** Returns null when the team project quota is full. */
	async insertTeamProjectWithAdmin(
		data: Pick<Project, 'name'> &
			Partial<Pick<Project, 'id' | 'icon' | 'description' | 'customTelemetryTags'>>,
		creatorId: string,
		limit: number,
	): Promise<Project | null> {
		// Keep the quota check and both inserts in one serializable transaction.
		return await this.txRunner.run(
			{},
			async (ctx) => {
				const manager = this.managerFor(ctx);
				if (limit !== UNLIMITED_LICENSE_QUOTA) {
					const count = await manager.count(Project, { where: { type: 'team' } });
					if (count >= limit) {
						if (data.id && (await manager.existsBy(Project, { id: data.id }))) {
							throw new ProjectIdConflictError();
						}
						return null;
					}
				}

				const project = this.create({ ...data, type: 'team', creatorId });
				try {
					await manager.insert(Project, project);
				} catch (error) {
					if (isUniqueConstraintError(error)) throw new ProjectIdConflictError();
					throw error;
				}
				await manager.insert(ProjectRelation, {
					projectId: project.id,
					userId: creatorId,
					role: { slug: 'project:admin' },
				});
				return await manager.findOneByOrFail(Project, { id: project.id });
			},
			{ isolationLevel: 'SERIALIZABLE' },
		);
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

	/** IDs of every team project, ordered for a stable export. */
	async findTeamProjectIds(): Promise<string[]> {
		const rows = await this.find({
			where: { type: 'team' },
			select: { id: true },
			order: { id: 'ASC' },
		});
		return rows.map(({ id }) => id);
	}

	/** Id and type of every project that exists with one of these ids. */
	async findTypesByIds(ids: string[]): Promise<Array<Pick<Project, 'id' | 'type'>>> {
		const rows: Array<Pick<Project, 'id' | 'type'>> = [];
		for (const batch of chunkIds(ids)) {
			rows.push(...(await this.find({ where: { id: In(batch) }, select: ['id', 'type'] })));
		}
		return rows;
	}

	async findTeamWithRelations(projectId: string): Promise<Project | null> {
		return await this.findOne({
			where: { id: projectId, type: 'team' },
			relations: { projectRelations: { role: true } },
		});
	}

	async findById(projectId: string): Promise<Project | null> {
		return await this.findOneBy({ id: projectId });
	}

	async findByIdOrFail(projectId: string): Promise<Project> {
		return await this.findOneByOrFail({ id: projectId });
	}

	async findByIdForUserWithRoles(
		projectId: string,
		userId?: string,
		projectRoles?: string[],
		ctx: OperationContext = {},
	): Promise<Project | null> {
		return await this.managerFor(ctx).findOne(Project, {
			where: {
				id: projectId,
				...(userId && projectRoles ? { projectRelations: { userId, role: In(projectRoles) } } : {}),
			},
		});
	}

	async loadRolesForProjectScopeCheck(ctx: OperationContext): Promise<Role[]> {
		return await this.managerFor(ctx).find(Role, { relations: ['scopes'] });
	}

	async findIdsForUserWithRoles({
		userId,
		projectRoles,
		projectIds,
		restrictToTeamProjects,
	}: {
		userId?: string;
		projectRoles?: string[];
		projectIds?: string[];
		restrictToTeamProjects?: boolean;
	}): Promise<string[]> {
		const batches = projectIds ? chunkIds([...new Set(projectIds)]) : [undefined];
		const result: string[] = [];
		for (const projectIdBatch of batches) {
			const projects = await this.find({
				where: {
					...(projectIdBatch ? { id: In(projectIdBatch) } : {}),
					...(restrictToTeamProjects ? { type: 'team' as const } : {}),
					...(userId && projectRoles
						? { projectRelations: { userId, role: In(projectRoles) } }
						: {}),
				},
				select: ['id'],
			});
			result.push(...projects.map(({ id }) => id));
		}
		return result;
	}

	async findByIdsForUserWithRoles(
		projectIds: string[],
		userId?: string,
		projectRoles?: string[],
	): Promise<Project[]> {
		if (projectIds.length === 0) return [];
		const projects: Project[] = [];
		for (const projectIdChunk of chunkIds([...new Set(projectIds)])) {
			projects.push(
				...(await this.find({
					where: {
						id: In(projectIdChunk),
						...(userId && projectRoles
							? { projectRelations: { userId, role: In(projectRoles) } }
							: {}),
					},
				})),
			);
		}
		return projects.sort(
			(a, b) =>
				a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
		);
	}

	async findExistingIds(projectIds: string[]): Promise<string[]> {
		if (projectIds.length === 0) return [];
		const result: string[] = [];
		for (const projectIdChunk of chunkIds([...new Set(projectIds)])) {
			const projects = await this.find({ select: ['id'], where: { id: In(projectIdChunk) } });
			result.push(...projects.map(({ id }) => id));
		}
		return result;
	}

	async findOwnedOrAdminByUser(userId: string): Promise<Project[]> {
		return await this.find({
			where: {
				projectRelations: {
					userId,
					role: In([PROJECT_OWNER_ROLE_SLUG, PROJECT_ADMIN_ROLE_SLUG]),
				},
			},
		});
	}

	async findPage({
		offset,
		limit,
	}: { offset: number; limit: number }): Promise<[Project[], number]> {
		return await this.findAndCount({
			skip: offset,
			take: limit,
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async updateTeamProject(
		projectId: string,
		changes: Partial<Pick<Project, 'name' | 'icon' | 'description' | 'customTelemetryTags'>>,
	): Promise<boolean> {
		const result = await this.update({ id: projectId, type: 'team' }, changes);
		return Boolean(result.affected);
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

	async findTeamProjects(): Promise<Project[]> {
		return await this.findBy({ type: 'team' });
	}

	async findTeamProjectsExcluding(excludedProjectIds: string[]): Promise<Project[]> {
		return await this.findBy({ type: 'team', id: Not(In(excludedProjectIds)) });
	}

	async getAccessibleProjectsByExactName(
		userId: string,
		name: string,
		type?: 'personal' | 'team',
	): Promise<Project[]> {
		const idsQuery = this.createQueryBuilder('p')
			.select('p.id', 'id')
			.innerJoin('p.projectRelations', 'pr')
			.where('pr.userId = :userId', { userId })
			.andWhere('LOWER(p.name) = LOWER(:name)', { name });

		if (type) {
			idsQuery.andWhere('p.type = :type', { type });
		}

		const query = this.createQueryBuilder('project')
			.leftJoin('project.creator', 'creator')
			.where(`project.id IN (${idsQuery.getQuery()})`)
			.setParameters(idsQuery.getParameters());
		this.applyActivationOrder(query);

		return await query.getMany();
	}

	async findAllProjectsAndCount(options: ProjectListOptions): Promise<[Project[], number]> {
		const query = this.createQueryBuilder('project').leftJoin('project.creator', 'creator');

		this.applyFilters(query, options);
		this.applyActivationOrder(query);
		this.applyPagination(query, options);

		return await query.getManyAndCount();
	}

	// Strict semantics: returns only projects the user has a relation to
	// (their personal project + projects they are explicitly a member of).
	// Do not broaden — peer-personal-project discovery for the share modal lives
	// in `getShareableProjectsAndCount` below; conflating the two has regressed
	// the share dropdown before (see IAM-591).
	async getAccessibleProjectsAndCount(
		userId: string,
		options: ProjectListOptions,
	): Promise<[Project[], number]> {
		const idsQuery = this.createQueryBuilder('p')
			.select('p.id', 'id')
			.innerJoin('p.projectRelations', 'pr')
			.where('pr.userId = :userId', { userId });

		this.applyIdsQueryFilters(idsQuery, options);
		return await this.runProjectListByIdsQuery(idsQuery, options);
	}

	// Wide semantics: returns peer personal projects in addition to projects
	// the user has a relation to. Used only by the sharing-discovery endpoint
	// (`GET /rest/projects/sharing-candidates`) so the workflow / credential
	// share dropdowns can list other users as share targets.
	async getShareableProjectsAndCount(
		userId: string,
		options: ProjectListOptions,
	): Promise<[Project[], number]> {
		// DISTINCT + LEFT JOIN avoids duplicate rows from the relation join
		// while still allowing personal projects with no caller relation to match.
		const idsQuery = this.createQueryBuilder('p')
			.select('DISTINCT p.id', 'id')
			.leftJoin('p.projectRelations', 'pr')
			.where(
				new Brackets((qb) => {
					qb.where('p.type = :personalType', { personalType: 'personal' }).orWhere(
						'pr.userId = :userId',
						{ userId },
					);
				}),
			);

		this.applyIdsQueryFilters(idsQuery, options);
		return await this.runProjectListByIdsQuery(idsQuery, options);
	}

	private applyIdsQueryFilters(
		idsQuery: SelectQueryBuilder<Project>,
		options: ProjectListOptions,
	): void {
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
	}

	private async runProjectListByIdsQuery(
		idsQuery: SelectQueryBuilder<Project>,
		options: ProjectListOptions,
	): Promise<[Project[], number]> {
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

	async deleteByIds(ids: string[]): Promise<void> {
		if (ids.length === 0) return;

		await this.delete({ id: In(ids) });
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
