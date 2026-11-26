import { Service } from '@n8n/di';
import { DataSource, type EntityManager, In } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { Project } from '../entities/project';
import { ProjectWorkflowReviewSettings } from '../entities/project-workflow-review-settings.ee';
import { type OperationContext, TransactionRunner } from '../services/transaction';
import { escapeLike, LIKE_ESCAPE_CLAUSE } from '../utils/escape-like';

class ProjectWorkflowReviewSettingsTable extends BaseRepository<ProjectWorkflowReviewSettings> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ProjectWorkflowReviewSettings, dataSource.manager, transactionRunner);
	}
}

export type ProjectWorkflowReviewRequirements = Pick<
	ProjectWorkflowReviewSettings,
	'requiredByProject' | 'requiredByInstance'
>;

export type TeamProjectWorkflowReviewRequirements = Pick<Project, 'id' | 'name' | 'icon'> &
	ProjectWorkflowReviewRequirements;

@Service()
export class ProjectWorkflowReviewSettingsRepository {
	private readonly table: ProjectWorkflowReviewSettingsTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ProjectWorkflowReviewSettingsTable(dataSource, transactionRunner);
	}

	async getRequirements(
		projectId: string,
		ctx: OperationContext,
	): Promise<ProjectWorkflowReviewRequirements> {
		const row = await this.table.managerFor(ctx).findOne(ProjectWorkflowReviewSettings, {
			where: { projectId },
			select: ['requiredByProject', 'requiredByInstance'],
		});
		return {
			requiredByProject: row?.requiredByProject ?? false,
			requiredByInstance: row?.requiredByInstance ?? false,
		};
	}

	/**
	 * Returns `true` only when the stored value changed, so concurrent writers report one change.
	 * Returns `null` when no team project has this id.
	 */
	async setRequiredByTeamProject(
		projectId: string,
		required: boolean,
		ctx: OperationContext,
	): Promise<boolean | null> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			if (!(await this.ensureTeamProjectRow(manager, projectId))) return null;
			// Only one of several concurrent saves matches the old value, so only one reports a change.
			const result = await manager.update(
				ProjectWorkflowReviewSettings,
				{ projectId, requiredByProject: !required },
				{ requiredByProject: required },
			);
			return (result.affected ?? 0) > 0;
		});
	}

	/** Same contract as `setRequiredByTeamProject`, for the option an instance admin sets. */
	async setRequiredByInstanceForTeamProject(
		projectId: string,
		required: boolean,
		ctx: OperationContext,
	): Promise<boolean | null> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			if (!(await this.ensureTeamProjectRow(manager, projectId))) return null;
			const result = await manager.update(
				ProjectWorkflowReviewSettings,
				{ projectId, requiredByInstance: !required },
				{ requiredByInstance: required },
			);
			return (result.affected ?? 0) > 0;
		});
	}

	/** Team projects sorted by name. A project without a settings row has both options off. */
	async findTeamProjectPage(
		{
			search,
			requiredByInstance,
			skip,
			take,
		}: { search?: string; requiredByInstance?: boolean; skip: number; take: number },
		ctx: OperationContext,
	): Promise<[TeamProjectWorkflowReviewRequirements[], number]> {
		const manager = this.table.managerFor(ctx);
		const query = manager
			.createQueryBuilder(Project, 'project')
			.leftJoin(ProjectWorkflowReviewSettings, 'settings', 'settings.projectId = project.id')
			.select(['project.id', 'project.name', 'project.icon'])
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
		if (requiredByInstance === true) {
			query.andWhere('settings.requiredByInstance = :required', { required: true });
		} else if (requiredByInstance === false) {
			query.andWhere('(settings.projectId IS NULL OR settings.requiredByInstance = :required)', {
				required: false,
			});
		}

		const [projects, count] = await query.getManyAndCount();
		if (projects.length === 0) return [[], count];

		const settings = await manager.find(ProjectWorkflowReviewSettings, {
			where: { projectId: In(projects.map(({ id }) => id)) },
			select: ['projectId', 'requiredByProject', 'requiredByInstance'],
		});
		const settingsByProjectId = new Map(settings.map((row) => [row.projectId, row]));

		const rows = projects.map(({ id, name, icon }) => ({
			id,
			name,
			icon,
			requiredByProject: settingsByProjectId.get(id)?.requiredByProject ?? false,
			requiredByInstance: settingsByProjectId.get(id)?.requiredByInstance ?? false,
		}));
		return [rows, count];
	}

	/**
	 * Creates the settings row of a team project if it is missing. Returns `false` when no team
	 * project has this id. The project row stays locked until the write commits, so a concurrent
	 * project delete cannot break the insert.
	 */
	private async ensureTeamProjectRow(manager: EntityManager, projectId: string): Promise<boolean> {
		const isPostgres = manager.connection.options.type === 'postgres';
		const project = await manager.findOne(Project, {
			where: { id: projectId, type: 'team' },
			select: ['id'],
			lock: isPostgres ? { mode: 'pessimistic_read' } : undefined,
		});
		if (!project) return false;

		await manager
			.createQueryBuilder()
			.insert()
			.into(ProjectWorkflowReviewSettings)
			.values({ projectId })
			.orIgnore()
			.execute();
		return true;
	}
}
