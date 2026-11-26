import type { PromotionProjectEnvironmentsAllowListProject } from '@n8n/api-types';
import {
	BaseRepository,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	type OperationContext,
	Project,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { PromotionProjectSettings } from '../entities/promotion-project-settings.entity';

class PromotionProjectSettingsTable extends BaseRepository<PromotionProjectSettings> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionProjectSettings, dataSource.manager, transactionRunner);
	}
}

@Service()
export class PromotionProjectSettingsRepository {
	private readonly table: PromotionProjectSettingsTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PromotionProjectSettingsTable(dataSource, transactionRunner);
	}

	/** Team projects sorted by name. A project without a settings row is not allowed. */
	async findTeamProjectPage(
		{
			search,
			allowEnvironments,
			skip,
			take,
		}: { search?: string; allowEnvironments?: boolean; skip: number; take: number },
		ctx: OperationContext,
	): Promise<[PromotionProjectEnvironmentsAllowListProject[], number]> {
		const manager = this.table.managerFor(ctx);
		const query = manager
			.createQueryBuilder(Project, 'project')
			.leftJoin(PromotionProjectSettings, 'settings', 'settings.projectId = project.id')
			.select(['project.id', 'project.name'])
			.where('project.type = :type', { type: 'team' })
			.orderBy('project.name', 'ASC')
			.addOrderBy('project.id', 'ASC')
			.offset(skip)
			.limit(take);

		if (search) {
			query.andWhere(`LOWER(project.name) LIKE LOWER(:search) ${LIKE_ESCAPE_CLAUSE}`, {
				search: `%${escapeLike(search)}%`,
			});
		}
		if (allowEnvironments === true) {
			query.andWhere('settings.allowEnvironments = :allowed', { allowed: true });
		} else if (allowEnvironments === false) {
			query.andWhere('(settings.projectId IS NULL OR settings.allowEnvironments = :allowed)', {
				allowed: false,
			});
		}

		const [projects, count] = await query.getManyAndCount();
		if (projects.length === 0) return [[], count];

		const settings = await manager.find(PromotionProjectSettings, {
			where: { projectId: In(projects.map(({ id }) => id)) },
			select: ['projectId', 'allowEnvironments'],
		});
		const allowedByProjectId = new Map(
			settings.map((row) => [row.projectId, row.allowEnvironments]),
		);

		const rows = projects.map(({ id, name }) => ({
			id,
			name,
			allowEnvironments: allowedByProjectId.get(id) ?? false,
		}));
		return [rows, count];
	}

	/**
	 * Returns `true` only when the stored value changed, so concurrent writers report one change.
	 * Returns `null` when no team project has this id.
	 */
	async setAllowEnvironmentsForTeamProject(
		projectId: string,
		allowEnvironments: boolean,
		ctx: OperationContext,
	): Promise<boolean | null> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			// The read lock holds a concurrent project delete until the insert commits.
			const isPostgres = manager.connection.options.type === 'postgres';
			const project = await manager.findOne(Project, {
				where: { id: projectId, type: 'team' },
				select: ['id'],
				lock: isPostgres ? { mode: 'pessimistic_read' } : undefined,
			});
			if (!project) return null;

			await manager
				.createQueryBuilder()
				.insert()
				.into(PromotionProjectSettings)
				.values({ projectId })
				.orIgnore()
				.execute();
			// Only one of several concurrent saves matches the old value, so only one reports a change.
			const result = await manager.update(
				PromotionProjectSettings,
				{ projectId, allowEnvironments: !allowEnvironments },
				{ allowEnvironments },
			);
			return (result.affected ?? 0) > 0;
		});
	}
}
