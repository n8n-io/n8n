import type { ScimTransferTargetPerson, ScimTransferTargetProject } from '@n8n/api-types';
import {
	BaseRepository,
	Project,
	ProjectRelation,
	SharedWorkflow,
	TransactionRunner,
	userGlobalRoleOrderSql,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type SelectQueryBuilder } from '@n8n/typeorm';

export type TransferTargetPageQuery = {
	/** Matches people by full name or email, and projects by name. */
	search?: string;
	skip: number;
	take: number;
};

export type TransferTargetPage<Item> = {
	/** Every valid target. The search does not change it. */
	total: number;
	/** The valid targets that match the search. */
	count: number;
	items: Item[];
};

type RawCounts = { total: number | string | null; matches: number | string | null };

/**
 * Matches the full name, which also covers the first and the last name, and
 * the email. The search reads the user columns, because the stored name of a
 * personal project can be older than the current name and email of the user.
 */
const PERSON_SEARCH_SQL =
	"(LOWER(COALESCE(user.firstName, '') || ' ' || COALESCE(user.lastName, '')) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))";

const PROJECT_SEARCH_SQL = 'LOWER(project.name) LIKE LOWER(:search)';

// PostgreSQL returns COUNT and SUM as strings, and SUM of no rows as null.
const toCounts = (raw: RawCounts | undefined) => ({
	total: Number(raw?.total ?? 0),
	matches: Number(raw?.matches ?? 0),
});

/** The project queries of the SCIM deprovisioning policy. */
@Service()
export class ScimTransferTargetRepository extends BaseRepository<Project> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Project, dataSource.manager, transactionRunner);
	}

	/**
	 * The project and its creator. For a personal project, the creator is the
	 * user of the project.
	 */
	async findWithCreator(projectId: string, ctx: OperationContext): Promise<Project | null> {
		return await this.managerFor(ctx).findOne(Project, {
			where: { id: projectId },
			relations: { creator: true },
		});
	}

	/**
	 * One page of the people that can get the work of a deleted user: the
	 * personal projects of active users. The owner comes first, then the
	 * admins, then every other role. People with a name come before people
	 * without one. Then the order is by name and email.
	 *
	 * The query count does not depend on the page size.
	 */
	async findPersonTargetPage(
		{ search, skip, take }: TransferTargetPageQuery,
		ctx: OperationContext,
	): Promise<TransferTargetPage<ScimTransferTargetPerson>> {
		const searchParameters: Record<string, string> = search ? { search: `%${search}%` } : {};
		const { total, matches } = await this.countMatches(
			this.personTargets(ctx),
			search ? PERSON_SEARCH_SQL : undefined,
			searchParameters,
		);
		if (take === 0 || matches === 0) return { total, count: matches, items: [] };

		const query = this.personTargets(ctx)
			.select('project.id', 'projectId')
			.addSelect('user.id', 'userId')
			.addSelect('user.firstName', 'firstName')
			.addSelect('user.lastName', 'lastName')
			.addSelect('user.email', 'email')
			.addSelect('user.role', 'role');
		if (search) query.andWhere(PERSON_SEARCH_SQL, searchParameters);

		const items = await query
			.orderBy(userGlobalRoleOrderSql('user'), 'ASC')
			.addOrderBy('CASE WHEN user.firstName IS NULL AND user.lastName IS NULL THEN 1 ELSE 0 END')
			.addOrderBy("LOWER(COALESCE(user.firstName, ''))")
			.addOrderBy("LOWER(COALESCE(user.lastName, ''))")
			.addOrderBy('LOWER(user.email)')
			.addOrderBy('user.id')
			.offset(skip)
			.limit(take)
			.getRawMany<ScimTransferTargetPerson>();

		return { total, count: matches, items };
	}

	/**
	 * One page of the team projects that can get the work of a deleted user,
	 * by name. Every team project is a valid target, with or without members.
	 *
	 * The member and workflow counts are subqueries of the page query, so the
	 * query count does not depend on the page size.
	 */
	async findProjectTargetPage(
		{ search, skip, take }: TransferTargetPageQuery,
		ctx: OperationContext,
	): Promise<TransferTargetPage<ScimTransferTargetProject>> {
		const searchParameters: Record<string, string> = search ? { search: `%${search}%` } : {};
		const { total, matches } = await this.countMatches(
			this.projectTargets(ctx),
			search ? PROJECT_SEARCH_SQL : undefined,
			searchParameters,
		);
		if (take === 0 || matches === 0) return { total, count: matches, items: [] };

		const manager = this.managerFor(ctx);
		const memberCount = manager
			.createQueryBuilder()
			.subQuery()
			.select('COUNT(*)')
			.from(ProjectRelation, 'member')
			.where('member.projectId = project.id')
			.getQuery();
		const workflowCount = manager
			.createQueryBuilder()
			.subQuery()
			.select('COUNT(*)')
			.from(SharedWorkflow, 'owned')
			.innerJoin('owned.workflow', 'workflow')
			.where('owned.projectId = project.id')
			.andWhere('owned.role = :workflowOwnerRole')
			.andWhere('workflow.isArchived = :workflowArchived')
			.getQuery();

		const query = this.projectTargets(ctx)
			.select(['project.id', 'project.name', 'project.icon'])
			.addSelect(memberCount, 'memberCount')
			.addSelect(workflowCount, 'workflowCount')
			.setParameters({ workflowOwnerRole: 'workflow:owner', workflowArchived: false });
		if (search) query.andWhere(PROJECT_SEARCH_SQL, searchParameters);

		// The entities parse the icon JSON the same way on every database.
		const { entities, raw } = await query
			.orderBy('LOWER(project.name)', 'ASC')
			.addOrderBy('project.id', 'ASC')
			.offset(skip)
			.limit(take)
			.getRawAndEntities<{
				project_id: string;
				memberCount: number | string;
				workflowCount: number | string;
			}>();

		const countsById = new Map(raw.map((row) => [row.project_id, row]));
		const items = entities.map((project) => {
			const counts = countsById.get(project.id);
			return {
				projectId: project.id,
				name: project.name,
				icon: project.icon,
				memberCount: Number(counts?.memberCount ?? 0),
				workflowCount: Number(counts?.workflowCount ?? 0),
			};
		});

		return { total, count: matches, items };
	}

	/**
	 * Same rule as `isValidScimTransferTarget`: the personal project of a user
	 * that is not deactivated.
	 */
	private personTargets(ctx: OperationContext) {
		return this.managerFor(ctx)
			.createQueryBuilder(Project, 'project')
			.innerJoin('project.creator', 'user')
			.where('project.type = :personalType', { personalType: 'personal' })
			.andWhere('user.disabled = :userDisabled', { userDisabled: false });
	}

	/** Same rule as `isValidScimTransferTarget`: every team project. */
	private projectTargets(ctx: OperationContext) {
		return this.managerFor(ctx)
			.createQueryBuilder(Project, 'project')
			.where('project.type = :teamType', { teamType: 'team' });
	}

	/** Counts every target and the targets that match the search, in one query. */
	private async countMatches(
		targets: SelectQueryBuilder<Project>,
		searchSql: string | undefined,
		searchParameters: Record<string, string>,
	) {
		const raw = await targets
			.select('COUNT(*)', 'total')
			.addSelect(
				searchSql ? `SUM(CASE WHEN ${searchSql} THEN 1 ELSE 0 END)` : 'COUNT(*)',
				'matches',
			)
			.setParameters(searchParameters)
			.getRawOne<RawCounts>();

		return toCounts(raw);
	}
}
