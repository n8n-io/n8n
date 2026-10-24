import type { ScimTransferTargetPerson, ScimTransferTargetProject } from '@n8n/api-types';
import {
	BaseRepository,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	Project,
	TransactionRunner,
	userGlobalRoleOrderSql,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { isRecord } from '@n8n/utils/is-record';

export type TransferTargetPageQuery = {
	/** Matches people by full name or email, and projects by name. */
	search?: string;
	skip: number;
	take: number;
};

export type TransferTargetPage<Item> = {
	/** The valid targets that match the search. */
	total: number;
	items: Item[];
};

/**
 * Matches the full name, which also covers the first and the last name, and
 * the email. The search reads the user columns, because the stored name of a
 * personal project can be older than the current name and email of the user.
 */
const PERSON_SEARCH_SQL = `(LOWER(COALESCE(user.firstName, '') || ' ' || COALESCE(user.lastName, '')) LIKE LOWER(:search) ${LIKE_ESCAPE_CLAUSE} OR LOWER(user.email) LIKE LOWER(:search) ${LIKE_ESCAPE_CLAUSE})`;

/** The `LIKE` pattern for a search, so that `%` and `_` match only themselves. */
const searchPattern = (search: string) => `%${escapeLike(search)}%`;

/** Reads a count that `loadRelationCountAndMap` set on the entity. */
function countOf(project: Project, key: 'memberCount' | 'workflowCount'): number {
	const value = isRecord(project) ? project[key] : undefined;
	return typeof value === 'number' ? value : 0;
}

class ProjectTable extends BaseRepository<Project> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Project, dataSource.manager, transactionRunner);
	}
}

/**
 * The project queries of the SCIM deprovisioning policy. Both apply the rule
 * of `isValidScimTransferTarget`. The query count does not depend on the
 * page size.
 */
@Service()
export class ScimTransferTargetRepository {
	private readonly table: ProjectTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ProjectTable(dataSource, transactionRunner);
	}

	/**
	 * One page of the people that can get the work of a deleted user: the
	 * personal projects of active users. The owner comes first, then the
	 * admins, then every other role. People with a name come before people
	 * without one. Then the order is by name and email.
	 */
	async findPersonTargetPage({
		search,
		skip,
		take,
	}: TransferTargetPageQuery): Promise<TransferTargetPage<ScimTransferTargetPerson>> {
		const query = this.table
			.createQueryBuilder('project')
			.innerJoin('project.creator', 'user')
			.where('project.type = :type', { type: 'personal' })
			.andWhere('user.disabled = :disabled', { disabled: false });
		if (search) query.andWhere(PERSON_SEARCH_SQL, { search: searchPattern(search) });

		const total = await query.getCount();
		// A limit of 0 is no limit.
		if (take === 0) return { total, items: [] };

		const items = await query
			.select('project.id', 'projectId')
			.addSelect('user.id', 'userId')
			.addSelect('user.firstName', 'firstName')
			.addSelect('user.lastName', 'lastName')
			.addSelect('user.email', 'email')
			.addSelect('user.role', 'role')
			.orderBy(userGlobalRoleOrderSql('user'), 'ASC')
			.addOrderBy('CASE WHEN user.firstName IS NULL AND user.lastName IS NULL THEN 1 ELSE 0 END')
			.addOrderBy("LOWER(COALESCE(user.firstName, ''))")
			.addOrderBy("LOWER(COALESCE(user.lastName, ''))")
			.addOrderBy('LOWER(user.email)')
			.addOrderBy('user.id')
			.offset(skip)
			.limit(take)
			.getRawMany<ScimTransferTargetPerson>();

		return { total, items };
	}

	/**
	 * One page of the team projects that can get the work of a deleted user,
	 * by name. Every team project is a valid target, with or without members.
	 */
	async findProjectTargetPage({
		search,
		skip,
		take,
	}: TransferTargetPageQuery): Promise<TransferTargetPage<ScimTransferTargetProject>> {
		const query = this.table.createQueryBuilder('project').where('project.type = :type', {
			type: 'team',
		});
		if (search) {
			query.andWhere(`LOWER(project.name) LIKE LOWER(:search) ${LIKE_ESCAPE_CLAUSE}`, {
				search: searchPattern(search),
			});
		}

		// A limit of 0 is no limit.
		if (take === 0) return { total: await query.getCount(), items: [] };

		const [projects, total] = await query
			.select(['project.id', 'project.name', 'project.icon'])
			.loadRelationCountAndMap('project.memberCount', 'project.projectRelations')
			.loadRelationCountAndMap('project.workflowCount', 'project.sharedWorkflows', 'owned', (qb) =>
				qb
					.innerJoin('owned.workflow', 'workflow')
					.andWhere('owned.role = :role', { role: 'workflow:owner' })
					.andWhere('workflow.isArchived = :isArchived', { isArchived: false }),
			)
			.orderBy('LOWER(project.name)', 'ASC')
			.addOrderBy('project.id', 'ASC')
			.offset(skip)
			.limit(take)
			.getManyAndCount();

		const items = projects.map((project) => ({
			projectId: project.id,
			name: project.name,
			icon: project.icon,
			memberCount: countOf(project, 'memberCount'),
			workflowCount: countOf(project, 'workflowCount'),
		}));

		return { total, items };
	}
}
